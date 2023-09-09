import { LuaValue, EnumLuaValue } from './lua-value'
import { LuaFunctionPrototype } from './lua-function'
import { LuaNil } from './lua-nil'
import { LuaUpValue } from './lua-upvalue'
import { LuaInstruction } from './luac-parse'
import { VMTable } from './lua-vmtable'


export class VMClosure {
    pc: number;
    registers: LuaValue<any>[];
    upvalues: (LuaUpValue | LuaNil)[];
    enclosingA: number
    enclosingC: number

    constructor(
        public functionPrototype: LuaFunctionPrototype,
        public env: VMTable
    ) {
        this.pc = 0
        this.registers = []
        this.upvalues = []
        this.enclosingA = -1
        this.enclosingC = -1
        for (let i = 0; i < functionPrototype.registersCount; i++){
            this.registers[i] = new LuaNil()
        }
        for (let i = 0; i < functionPrototype.upvaluesCount; i++){
            this.upvalues[i] = new LuaNil()
        }
    }

    /**
     * During CALL instruction, setup is called after registers are set,
     * but before control is passed to this closure.
     * @param A 
     * @param C 
     */
    setup(A: number, C: number) : void {
        this.enclosingA = A
        this.enclosingC = C
    }

    /**
     * During RETURN instruction, cleanup is called after registers are copied,
     * but before control is passed to enclosingClosure
     */
    cleanup() : void {
        this.pc = 0
        // close upvalues
        this.upvalues.forEach(upv=>(upv as LuaUpValue).close(this))
    }

    nextInstruction() : LuaInstruction {
        const instr = this.functionPrototype.instructions[this.pc]
        this.pc++
        return instr
    }

    constantGet(constant: number): LuaValue<any> {
        if (constant >= this.functionPrototype.constantsCount) {
            throw new Error(`Constant number out of range. ${constant} >= ${this.functionPrototype.constantsCount}`)
        }
        return this.functionPrototype.constants[constant]
    }

    jmp(skip: number): void {
        this.pc += skip
    }

    registerGet(register: number): LuaValue<any> {
        if (register >= this.functionPrototype.registersCount) {
            throw new Error(`Register number out of range ${register} >= ${this.functionPrototype.registersCount}`)
        }
        return this.registers[register]
    }

    registerSet(register: number, value: LuaValue<any>) : void {
        if (register === null || register === undefined || register === undefined) {
            throw new Error(`Cannot set register ${register} to ${value}`)
        }
        if (register >= this.functionPrototype.registersCount) {
            throw new Error(`Register number out of range ${register} >= ${this.functionPrototype.registersCount}`)
        }
        this.registers[register] = value
    }

    upvalueGet(index: number) : LuaValue<any> {
        if (index >= this.functionPrototype.upvaluesCount) {
            throw new Error(`upvalueindex out of range ${index} >= ${this.functionPrototype.upvaluesCount}`)
        }
        const v = this.upvalues[index]
        if (v.type === EnumLuaValue.LuaNil) {
            throw new Error(`Upvalue ${index} is nil`)
        }
        const upv = v as LuaUpValue
        return upv.get()
    }

    upvalueSet(index: number, value: LuaValue<any>) : void {
        if (index >= this.functionPrototype.upvaluesCount) {
            throw new Error(`upvalueindex out of range ${index} >= ${this.functionPrototype.upvaluesCount}`)
        }
        const v = this.upvalues[index]
        if (v.type === EnumLuaValue.LuaNil) {
            throw new Error(`Upvalue ${index} is nil`)
        }
        const upv = v as LuaUpValue
        upv.set(value)
    }

    upvalueNew(index: number, closureReference: VMClosure, registerIndex: number) : LuaUpValue {
        if (index >= this.functionPrototype.upvaluesCount) {
            throw new Error(`upvalueindex out of range ${index} >= ${this.functionPrototype.upvaluesCount}`)
        }
        const v =  new LuaUpValue(registerIndex, closureReference)
        this.upvalues[index] = v
        return v
    }

    upvalueRef(index: number) : LuaUpValue {
        if (index >= this.functionPrototype.upvaluesCount) {
            throw new Error(`upvalueindex out of range ${index} >= ${this.functionPrototype.upvaluesCount}`)
        }
        const v = this.upvalues[index]
        if (v.type === EnumLuaValue.LuaUpValue) {
            return v as LuaUpValue
        } else {
            throw new Error('Upvalue Reference is Nil')
        }
    }
}

