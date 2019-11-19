import wanwuSentry from '../index'

test('My Greeter', () => {
    expect(
        wanwuSentry.setMySentryError({
            response: 'x',
            message: 'x',
        }),
    ).toEqual({
        response: 'x',
        message: 'x',
    })
})
