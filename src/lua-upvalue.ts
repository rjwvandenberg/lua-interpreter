import { LuaValue, EnumLuaValue } from './lua-value'
import { upvalueMetatable } from './lua-metatable'
import { VMClosure } from './lua-vmclosure'

//https://www.lua.org/doc/jucs05.pdf ch5

export class LuaUpValue extends LuaValue<any> {
    constructor(
        public registerIndex: number,
        public closureReference: VMClosure,
        public isOpen: boolean = true,
        data: LuaValue<any> | null = null,
    ) {
        super(EnumLuaValue.LuaUpValue, upvalueMetatable, data)
    }

    get() : LuaValue<any> {
        if (this.isOpen) {
            return this.closureReference.registerGet(this.registerIndex)
        } else {
            if (this.data === null) {
                throw new Error('Cannot get upvalue that is null')
            } else {
                return this.data
            }
        }
    }

    set(value: LuaValue<any>) : void {
        if (this.isOpen) {
            this.closureReference.registerSet(this.registerIndex, value)
        } else {
            this.data = value
        }
    }

    close(closure: VMClosure, startIndex: number = 0) : void {
        // need to review closing of upvalues, does it keep refering to the same 
        // variable as all other closures that went out of scope, so should be a shared
        // location that can be edited?

        // close when this.closurereference === closure that is being returned?
        // would prob. need to put upvalue in registers instead of copying data?
        // or rather have a single base upvalue, that is copied,
        // and so when referencing upvalue, no new one is created, but same one is used.
        // and the data value remains internal to the upvalue?
        if (this.closureReference === closure && this.registerIndex >= startIndex) {
            this.isOpen = false
            this.data = this.closureReference.registerGet(this.registerIndex)
        }
    }
}
