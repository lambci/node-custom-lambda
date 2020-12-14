const searchPaths = [
    'file:///opt/nodejs/',
    `file:///opt/node${getMajorVersion()}/`,
    'file:///var/runtime/'
]

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


function getMajorVersion() {
    let version = process.version
    return version.slice(1, version.indexOf('.'))
}
