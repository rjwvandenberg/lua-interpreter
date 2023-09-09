import { VMExternalClosure, createExternalFunctionPrototype } from './lua-externalclosure'
import { LuaFunction } from './lua-function'
import { LuaValue, EnumLuaValue } from './lua-value'
import { VMClosure } from './lua-vmclosure'
import { LuaVM } from './lua-vm'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

// https://www.lua.org/source/5.1/lbaselib.c.html

function loadBaseF(vm: LuaVM) : void {
    const assert = new LuaFunction(new VMExternalClosure( 
        vm.closure.env,
        createExternalFunctionPrototype('assert', 1, 1, 0),
        (registers: LuaValue<any>[]) => {
            const v = registers[0]
            if (!v || v.type === EnumLuaValue.LuaNil || !v.data) {
                throw new Error('Assertion failed')
            }
        }
    )) 
    
    const collectGarbage = new LuaFunction(new VMExternalClosure(
        vm.closure.env,
        createExternalFunctionPrototype('collectGarbage', 0, 0, 0),
        (registers: LuaValue<any>[]) => {
            // nodejs gc, maybe need to cleanup some references in some places
        }
    ))

    const luatype = new LuaFunction(new VMExternalClosure(
        vm.closure.env,
        createExternalFunctionPrototype('type', 1, 1, 1),
        (registers: LuaValue<any>[]) => {
            // set typename to register 0
            // NONE is typename 'no value'
            let name = 'no value'
            switch(registers[0].type) {
                case EnumLuaValue.LuaNil: name = 'nil'; break
                case EnumLuaValue.LuaBool: name = 'bool'; break
                case EnumLuaValue.LuaFunction: name = 'function'; break
                case EnumLuaValue.LuaNumber: name = 'number'; break
                case EnumLuaValue.LuaString: name = 'string'; break
                case EnumLuaValue.LuaTable: name = 'table'; break
                default: throw new Error(`lualib-base luatype ${registers[0].data} not implemented`)
            }
    
            registers[0] = new LuaString(name)
        }
    ))
    
    vm.loadLibrary('assert', assert)
    vm.loadLibrary('collectgarbage', collectGarbage)
    vm.loadLibrary('type', luatype)
}

import * as child_process from 'child_process'
import { loadLuaC } from './luac-parse'
import { LuaString } from './lua-string'
import { LuaTable } from './lua-table'
function loadLoadString(vm: LuaVM) : void {
    const compilerpath = '"lua-compiler/luac5.1.exe"'
    let tempfile = 0
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'luatools'))
    console.log(`tmpdir    ${tmpdir}`)
    
    const loadString = new LuaFunction(new VMExternalClosure(
        vm.closure.env,
        createExternalFunctionPrototype('loadString', 1, 1, 1),
        (registers: LuaValue<any>[]) => {
            if (registers[0].type !== EnumLuaValue.LuaString) {
                throw new Error('cannot compile non string')
            }
            
            const filename = path.join(tmpdir, `${tempfile}`)
            tempfile++
            // write to temp file 
            fs.writeFileSync(filename, registers[0].data)

            const compiledpath = filename + 'c'
            const commandstr = `${compilerpath} -o ${compiledpath} ${filename}`
            // compile temp file, throws if non 0 exitcode
            const commandres = child_process.execSync(commandstr)
            if (commandres.toString().trim() !== '') {
                throw new Error('Expected empty result when compiling')
            }

            // if successfull create top-level closure into first register
            const luac = loadLuaC(compiledpath)
            registers[0] = new LuaFunction(new VMClosure(luac.topLevelFunction, vm.closure.env))
            
            // think this is how it works
        }
    ))

    vm.loadLibrary('loadstring', loadString)
}

function loadFEnv(vm: LuaVM) : void {
    /**
     *  CALL A B C:  {"opcode":28,"A":2,"B":2,"C":0}
     *  example
     * [0] table
     */
    const getfenv = new LuaFunction(new VMExternalClosure(
        vm.closure.env,
        createExternalFunctionPrototype('getfenv', 1, 1, 1),
        (registers: LuaValue<any>[]) => {
            // maybe at least partially correct
            // https://www.lua.org/source/5.1/lbaselib.c.html#getfunc
            registers[0] = new LuaTable(vm.closure.env)
        }
    ))

    /**
     * CALL A B C:         10      3      2    Call function in R(10)
     * example:
     *  [0] function
     *  [1] table
     */
    const setfenv = new LuaFunction(new VMExternalClosure(
        vm.closure.env,
        createExternalFunctionPrototype('getfenv', 2, 2, 1),
        (registers: LuaValue<any>[]) => {
            const f = registers[0].data as VMClosure
            f.env = registers[1].data
        }
    ))

    vm.loadLibrary('getfenv', getfenv)
    vm.loadLibrary('setfenv', setfenv)
}

function loadBase(vm: LuaVM) : void {
    loadBaseF(vm)
    loadFEnv(vm)
    loadLoadString(vm)
}

export { loadBase }