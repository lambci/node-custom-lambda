import {pathToFileURL} from "url"
import path from "path"

const searchPaths = process.env.NODE_PATH.split(path.delimiter).map(path => pathToFileURL(path).href)

export async function resolve(specifier, context, defaultResolve) {
    try {
        return defaultResolve(specifier, context, defaultResolve)
    } catch {}

    for (const parentURL of searchPaths) {
        try {
            return defaultResolve(specifier, {...context, parentURL}, defaultResolve)
        } catch {}
    }

    throw new Error(`Cannot find package '${specifier}': attempted to import from paths [${[context.parentURL, ...searchPaths].join(', ')}]`)
}
