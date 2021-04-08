import http from 'http'
import { createRequire } from 'module'
import path from 'path'
import { stat, readFile } from "fs/promises"

const RUNTIME_PATH = '/2018-06-01/runtime'

const CALLBACK_USED = Symbol('CALLBACK_USED')

const {
  AWS_LAMBDA_FUNCTION_NAME,
  AWS_LAMBDA_FUNCTION_VERSION,
  AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
  AWS_LAMBDA_LOG_GROUP_NAME,
  AWS_LAMBDA_LOG_STREAM_NAME,
  LAMBDA_TASK_ROOT,
  _HANDLER,
  AWS_LAMBDA_RUNTIME_API,
} = process.env

const [HOST, PORT] = AWS_LAMBDA_RUNTIME_API.split(':')

start()

async function start() {
  let handler
  try {
    handler = await getHandler()
  } catch (e) {
    await initError(e)
    return process.exit(1)
  }
  tryProcessEvents(handler)
}

async function tryProcessEvents(handler) {
  try {
    await processEvents(handler)
  } catch (e) {
    console.error(e)
    return process.exit(1)
  }
}

async function processEvents(handler) {
  while (true) {
    const { event, context } = await nextInvocation()

    let result
    try {
      result = await handler(event, context)
    } catch (e) {
      await invokeError(e, context)
      continue
    }
    const callbackUsed = context[CALLBACK_USED]

    await invokeResponse(result, context)

    if (callbackUsed && context.callbackWaitsForEmptyEventLoop) {
      return process.prependOnceListener('beforeExit', () => tryProcessEvents(handler))
    }
  }
}

function initError(err) {
  return postError(`${RUNTIME_PATH}/init/error`, err)
}

async function nextInvocation() {
  const res = await request({ path: `${RUNTIME_PATH}/invocation/next` })

  if (res.statusCode !== 200) {
    throw new Error(`Unexpected /invocation/next response: ${JSON.stringify(res)}`)
  }

  if (res.headers['lambda-runtime-trace-id']) {
    process.env._X_AMZN_TRACE_ID = res.headers['lambda-runtime-trace-id']
  } else {
    delete process.env._X_AMZN_TRACE_ID
  }

  const deadlineMs = +res.headers['lambda-runtime-deadline-ms']

  const context = {
    awsRequestId: res.headers['lambda-runtime-aws-request-id'],
    invokedFunctionArn: res.headers['lambda-runtime-invoked-function-arn'],
    logGroupName: AWS_LAMBDA_LOG_GROUP_NAME,
    logStreamName: AWS_LAMBDA_LOG_STREAM_NAME,
    functionName: AWS_LAMBDA_FUNCTION_NAME,
    functionVersion: AWS_LAMBDA_FUNCTION_VERSION,
    memoryLimitInMB: AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
    getRemainingTimeInMillis: () => deadlineMs - Date.now(),
    callbackWaitsForEmptyEventLoop: true,
  }

  if (res.headers['lambda-runtime-client-context']) {
    context.clientContext = JSON.parse(res.headers['lambda-runtime-client-context'])
  }

  if (res.headers['lambda-runtime-cognito-identity']) {
    context.identity = JSON.parse(res.headers['lambda-runtime-cognito-identity'])
  }

  const event = JSON.parse(res.body)

  return { event, context }
}

async function invokeResponse(result, context) {
  const res = await request({
    method: 'POST',
    path: `${RUNTIME_PATH}/invocation/${context.awsRequestId}/response`,
    body: JSON.stringify(result === undefined ? null : result),
  })
  if (res.statusCode !== 202) {
    throw new Error(`Unexpected /invocation/response response: ${JSON.stringify(res)}`)
  }
}

function invokeError(err, context) {
  return postError(`${RUNTIME_PATH}/invocation/${context.awsRequestId}/error`, err)
}

async function postError(path, err) {
  const lambdaErr = toLambdaErr(err)
  const res = await request({
    method: 'POST',
    path,
    headers: {
      'Content-Type': 'application/json',
      'Lambda-Runtime-Function-Error-Type': lambdaErr.errorType,
    },
    body: JSON.stringify(lambdaErr),
  })
  if (res.statusCode !== 202) {
    throw new Error(`Unexpected ${path} response: ${JSON.stringify(res)}`)
  }
}

async function getHandler() {
  const moduleParts = _HANDLER.split('.')
  if (moduleParts.length !== 2) {
    throw new Error(`Bad handler ${_HANDLER}`)
  }

  const [modulePath, handlerName] = moduleParts
  const {type: moduleLoaderType, ext} = await getModuleLoaderType(`${LAMBDA_TASK_ROOT}/${modulePath}`)

  // Let any errors here be thrown as-is to aid debugging
  const importPath = `${LAMBDA_TASK_ROOT}/${modulePath}.${ext}`
  const module = moduleLoaderType === 'module' ? await import(importPath) : createRequire(import.meta.url)(importPath)

  const userHandler = module[handlerName]

  if (userHandler === undefined) {
    throw new Error(`Handler '${handlerName}' missing on module '${modulePath}'`)
  } else if (typeof userHandler !== 'function') {
    throw new Error(`Handler '${handlerName}' from '${modulePath}' is not a function`)
  }

  return (event, context) => new Promise((resolve, reject) => {
    const callback = (err, data) => {
      context[CALLBACK_USED] = true
      if(err) {
        reject(err)
      } else {
        resolve(data)
      }
    }

    let result
    try {
      result = userHandler(event, context, callback)
    } catch (e) {
      return reject(e)
    }
    if (typeof result === 'object' && result != null && typeof result.then === 'function') {
      result.then(resolve, reject)
    }
  })
}

/**
 * @param {string} modulePath path to executeable with no file extention
 * @returns {Promise<{
 *   type: 'commonjs' | 'module',
 *   ext: 'mjs' | 'cjs' | 'js'
 * }>} loader type and extention for loading module
 */
async function getModuleLoaderType(modulePath) {
  //do all promises async so they dont have to wait on eachother
  const [typ, mjsExist, cjsExist] = await Promise.all([
    getPackageJsonType(modulePath),
    fileExists(modulePath + '.mjs'),
    fileExists(modulePath + '.cjs')
  ])

  //priority here is basically cjs -> mjs -> js
  //pjson.type defaults to commonjs so always check if 'module' first
  if(mjsExist && cjsExist) {
    if(typ === 'module') { return {type: 'module', ext: 'mjs'} }
    return {type: 'commonjs', ext: 'cjs'}
  }
  //only one of these exist if any
  if(mjsExist) { return {type: 'module', ext: 'mjs'} }
  if(cjsExist) { return {type: 'commonjs', ext: 'cjs'} }
  //js is the only file, determine type based on pjson
  if(typ === 'module') { return {type: 'module', ext: 'js'} }
  return {type: 'commonjs', ext: 'js'}
}

async function fileExists(fullPath) {
  try {
    await stat(fullPath)
    return true
  } catch {
    return false
  }
}

/**
 * @param {string} modulePath path to executeable with no file extention
 * @returns {Promise<'module' | 'commonjs'>}
 */
async function getPackageJsonType(modulePath) {
  //try reading pjson until we reach root. i.e. '/' !== path.dirname('/')
  //there is probably a way to make it search in parallel, returning the first match in the hierarchy, but it seems more trouble than its worth
  for(let dir = path.dirname(modulePath); dir !== path.dirname(dir); dir = path.dirname(dir)) {
    try {
      const {type} = JSON.parse(await readFile(dir + path.sep + 'package.json', 'utf-8'))
      return type || 'commonjs'
    } catch {
      //do nothing
    }
  }

  //if we reach root, return empty pjson
  return 'commonjs'
}

function request(options) {
  options.host = HOST
  options.port = PORT

  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      const bufs = []
      res.on('data', data => bufs.push(data))
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(bufs).toString(),
      }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end(options.body)
  })
}

function toLambdaErr(err) {
  const { name, message, stack } = err
  return {
    errorType: name || typeof err,
    errorMessage: message || ('' + err),
    stackTrace: (stack || '').split('\n').slice(1),
  }
}
