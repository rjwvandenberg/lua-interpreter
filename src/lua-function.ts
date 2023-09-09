import { VMClosure } from './lua-vmclosure'
import { LuaValue, LuaInt, EnumLuaValue } from './lua-value'
import { LuaString } from './lua-string'
import { LuaInstruction, LuaLocalVar } from './luac-parse'
import { functionMetatable } from './lua-metatable'

export class LuaFunction extends LuaValue<VMClosure> {
    constructor(data: VMClosure) {
        super(EnumLuaValue.LuaFunction, functionMetatable, data)
    }
}

export interface LuaFunctionPrototype {
    toplevel: boolean
    sourceName: LuaString
    line: LuaInt
    lastline: LuaInt
    upvaluesCount: number
    parametersCount: number
    varArg: number
    registersCount: number
    instructionsCount: LuaInt
    instructions: LuaInstruction[]
    constantsCount: LuaInt
    constants: LuaValue<any>[]
    functionPrototypesCount: LuaInt
    functionPrototypes: LuaFunctionPrototype[]
    lineinfoCount: LuaInt
    lineinfoList: LuaInt[]
    localvarCount: LuaInt
    localvarList: LuaLocalVar[]
    upvalueCount: LuaInt
    upvalueList: LuaString[]
}