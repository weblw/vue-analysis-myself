/* @flow */

import { baseOptions } from './options'
import { createCompiler } from 'compiler/index'

// 通过编译参数返回
const { compile, compileToFunctions } = createCompiler(baseOptions)

export { compile, compileToFunctions }
