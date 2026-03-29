import { Notify } from 'quasar'

export function createNotifyWarning(message: string, header = '') {
  createNotify(message, header, 'warning')
}

export function createNotifySuccess(message: string, header = '') {
  createNotify(message, header, 'positive')
}

export function createNotify(
  message: string | object,
  header: string | object | undefined = undefined,
  type = 'negative',
) {
  // console.log('createNotify', message, header, type);
  if (typeof message === 'object') message = JSON.stringify(message)
  if (typeof header === 'object') header = JSON.stringify(header)
  let caption = undefined
  if (header !== undefined) {
    const temp = message
    message = header
    caption = temp
  }
  //@ts-ignore
  Notify.create({
    type: type,
    position: 'top',
    caption: caption,
    message: message,
  })
}
