import { VueConstructor } from 'vue'
import * as Sentry from '@sentry/browser'
import * as Integrations from '@sentry/integrations'
type types = 'xhr' | 'IM_Warning' | 'JsBridge' | 'javascript'
type env = 'xcx' | 'vue' | 'javascript'
declare var window: any

interface IOption {
    dsn: string
    environment: string
    env: env
    vue?: VueConstructor
    ignoreErrors?: Array<string | RegExp>
    blacklistUrls?: Array<string | RegExp>
    whitelistUrls?: Array<string | RegExp>
    beforeBreadcrumb?: (breadcrumb: Sentry.Breadcrumb, hint: any) => Sentry.Breadcrumb | any
    beforeSend?: (event: Sentry.Event, hint: any) => Sentry.Event
    window?: Window
    callback?: () => void
}

interface IContent {
    key: string
    value: any
}

interface IUserOrTag {
    user?: any
    tag?: any
    content?: IContent
}

interface IErrorOpt {
    response?: any
    message?: string | null | undefined | ''
    type?: types
    isAxiosError?: boolean
}

interface IConfig {
    window?: Window
    vue?: VueConstructor
    env: env
}

const wanwuSentry = () => {
    let myEnv: env
    const init = (option: IOption) => {
        myEnv = option.env

        if (!myEnv) {
            throw new Error('请指明运行环境xcx|vue|javascript')
        }

        const baseOpt = {
            dsn: option.dsn,
            environment: option.environment,
            beforeBreadcrumb(breadcrumb: Sentry.Breadcrumb, hint: any) {
                if (option.beforeBreadcrumb) {
                    breadcrumb = option.beforeBreadcrumb(breadcrumb, hint)
                }
                return breadcrumb
            },
            beforeSend(event: Sentry.Event, hint: any) {
                if (option.beforeSend) {
                    event = option.beforeSend(event, hint)
                }
                return event
            },
        }
        Sentry.onLoad(() => {
            if (myEnv === 'vue' && option.vue) {
                const vueOpt = {
                    ...baseOpt,
                    integrations: [
                        new Integrations.Vue({
                            Vue: option.vue,
                            attachProps: true,
                        }),
                        new Sentry.Integrations.InboundFilters({
                            ignoreErrors: option.ignoreErrors || [],
                            blacklistUrls: option.blacklistUrls || [],
                            whitelistUrls: option.whitelistUrls || [],
                        }),
                    ],
                }
                Sentry.init(vueOpt)
                setConfig({
                    vue: option.vue,
                    env: option.env,
                })
            } else {
                const javascriptOpt = {
                    ...baseOpt,
                    integrations: [
                        new Sentry.Integrations.InboundFilters({
                            ignoreErrors: option.ignoreErrors,
                            blacklistUrls: option.blacklistUrls,
                            whitelistUrls: option.whitelistUrls,
                        }),
                    ],
                }
                Sentry.init(javascriptOpt)
                setConfig({
                    window: option.window,
                    env: option.env,
                })
            }

            if (option.callback) {
                option.callback()
            }
        })
    }

    const setLog = (err: any, type: types, level: Sentry.Severity, message: string) => {
        Sentry.withScope(scope => {
            scope.setLevel(level)
            scope.setExtra('error', {
                err,
            })
            scope.setTag('errorType', type)
            Sentry.captureMessage(message)
        })
    }

    const logError = (err: any) => {
        let message: string
        let level: Sentry.Severity
        let type: types
        if (err.isAxiosError || err.type === 'xhr') {
            message = err.message || (err.response && err.response.data && err.response.data.message) || '网络异常问题'
            level = Sentry.Severity['Info']
            type = 'xhr'
        } else if (err.ErrorInfo) {
            message = err.ErrorInfo || 'IM异常'
            level = Sentry.Severity['Warning']
            type = 'IM_Warning'
        } else if (err.type === 'JsBridge') {
            message = err.message || 'JsBridge异常'
            level = Sentry.Severity['Warning']
            type = 'JsBridge'
        } else {
            message = err.message || '语法问题'
            level = Sentry.Severity['Error']
            type = 'javascript'
        }

        setLog(err, type, level, message)
    }

    const setMySentryError = (opt: IErrorOpt) => {
        const error: IErrorOpt = {
            ...opt,
        }
        return error
    }

    const fnErrorTrap = (err: any) => {
        logError(err)
    }

    const setUserOrTag = (opt: IUserOrTag) => {
        if (opt.user) {
            Sentry.setUser(opt.user)
        }
        if (opt.tag) {
            Sentry.setTags(opt.tag)
        }
        if (opt.content) {
            Sentry.setContext(opt.content.key, opt.content.value)
        }
    }

    const setConfig = (opt: IConfig) => {
        if (myEnv === 'vue' && opt.vue) {
            opt.vue.config.errorHandler = fnErrorTrap
        } else {
            if (window) {
                window.onerror = fnErrorTrap
            }
        }
    }

    return {
        init,
        logError,
        setMySentryError,
        setUserOrTag,
    }
}

export default wanwuSentry()
