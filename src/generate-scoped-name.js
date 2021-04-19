import { compact, join } from '@dword-design/functions'
import loadPkg from 'load-pkg'
import parsePackagejsonName from 'parse-packagejson-name'

const packageConfig = loadPkg.sync()

const nameParts = parsePackagejsonName(packageConfig.name)

const stylePrefix =
  [nameParts.scope, nameParts.fullName] |> compact |> join('-')

export default `${stylePrefix}__[local]__[hash:base64:4]`
