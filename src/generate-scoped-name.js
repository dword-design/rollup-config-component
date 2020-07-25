import { compact, join } from '@dword-design/functions'
import loadPkg from 'load-pkg'
import parsePkgName from 'parse-pkg-name'

const packageConfig = loadPkg.sync()
const nameParts = parsePkgName(packageConfig.name)
const stylePrefix = [nameParts.org, nameParts.name] |> compact |> join('-')

export default `${stylePrefix}__[local]__[hash:base64:4]`
