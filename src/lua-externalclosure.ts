import { VMClosure } from './lua-vmclosure'
import { LuaInstruction } from './luac-parse'
import { LuaString } from './lua-string'
import { LuaFunctionPrototype, LuaFunction } from './lua-function'
import { LuaValue } from './lua-value'
import { VMTable } from './lua-vmtable'

export class VMExternalClosure extends VMClosure {
    functionHandler: (registers:LuaValue<any>[])=>void
    constructor(env: VMTable, f: LuaFunctionPrototype, functionHandler: (registers:LuaValue<any>[])=>void) {
        super(f, env)
        this.functionHandler = functionHandler
    }

    setup(A: number, C: number) : void {
        super.setup(A, C)
        this.functionHandler(this.registers)
    }

    cleanup() : void {
        this.registers = []
        this.pc = 0
    }
}

export function createExternalFunctionPrototype (name: string, parameterCount: number, registerCount: number, resultCount: number, upvaluesCount: number = 0) : LuaFunctionPrototype {
    const fp = {
        toplevel: false,
        sourceName: new LuaString(name),
        line: -1,
        lastline: -1,
        upvaluesCount: upvaluesCount,
        parametersCount: parameterCount,
        varArg: -1,
        registersCount: registerCount,
        instructionsCount: 1,
        instructions: [{opcode: 30, A: 0, B: resultCount+1, C: -1, Bx: -1, sBx: -1} as LuaInstruction],
        constantsCount: 0,
        constants: [],
        functionPrototypesCount: 0,
        functionPrototypes: [],
        lineinfoCount: -1,
        lineinfoList: [],
        localvarCount: -1,
        localvarList: [],
        upvalueCount: -1,
        upvalueList: [],
        blockSize: 0,
    } as LuaFunctionPrototype

    return fp
}

export const functionstub = new LuaFunction(new VMExternalClosure(
    createExternalFunctionPrototype('functionstub', 10000, 10000, 10000),
    (registers: LuaValue<any>[]) => {
        throw new Error('External function not implemented :)')
    })
)