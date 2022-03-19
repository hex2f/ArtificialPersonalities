import { FormData } from 'node-fetch'

export default (obj: {[key: string]: any}): FormData =>
  Object
    .keys(obj)
    .reduce((formData, key) => {
      formData.append(key, obj[key])
      return formData
    }, new FormData())
