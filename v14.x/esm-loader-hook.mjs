export async function resolve(specifier, context, defaultResolve) {
    try {
        return await defaultResolve(specifier, {
            ...context,
            parentURL: 'file:///opt/nodejs/'
        }, defaultResolve)
    } catch (err) {
        return await defaultResolve(specifier, context, defaultResolve)
    }
}
