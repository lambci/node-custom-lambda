// Test that global requires work
import fs from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

import aws4 from 'aws4'

const interval = setInterval(console.log, 100, 'ping')

const sleep = async (millisecond) => await new Promise(res => setTimeout(res, millisecond))

// Test top-level await works
await sleep(10)

export const handler = async (event, context) => {
  console.log(process.version)
  console.log(process.execPath)
  console.log(process.execArgv)
  console.log(process.argv)
  console.log(process.cwd())
  console.log(process.env)
  console.log(event)
  console.log(context)
  console.log(context.getRemainingTimeInMillis())
  console.log(aws4)
  return { some: 'obj!' }
}

export const handler2 = (event, context) => {
  setTimeout(context.done, 100, null, { some: 'obj!' })
}

export const handler3 = (event, context) => {
  setTimeout(context.succeed, 100, { some: 'obj!' })
}

export const handler4 = (event, context) => {
  setTimeout(context.fail, 100, new Error('This error should be logged'))
}

export const handler5 = (event, context, cb) => {
  setTimeout(cb, 100, null, { some: 'obj!' })
  setTimeout(clearInterval, 100, interval)
}

export const handler6 = (event, context, cb) => {
  context.callbackWaitsForEmptyEventLoop = false
  setTimeout(cb, 100, null, { some: 'obj!' })
}

export const handler7 = async (event, context) => {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const data = await new Promise((res, rej) => {
    fs.readFile(`${__dirname}/data.json`, (err, str) => {
      if (err) return rej(err)
      else res(JSON.parse(str))
    })
  })
  return { some: 'obj!', data }
}
