import { VMTable } from './lua-vmtable'
import { NIL } from './lua-nil'
import { LuaValue, EnumLuaValue } from './lua-value'

export type JSMetaFunctionType = (...args: LuaValue<any>[])=>LuaValue<any>

export class Metatable extends VMTable {   
    constructor() {
        super(0,0)
        // If a metatable does not have a replacement for event it returns LuaNil, so setup this default behaviour
        // Arithmetic
        this.array.set('__add', NIL)
        this.array.set('__sub', NIL)
        this.array.set('__mul', NIL)
        this.array.set('__div', NIL)
        this.array.set('__pow', NIL)
        this.array.set('__mod', NIL)
        this.array.set('__unm', NIL)
        // Order comparison
        this.array.set('__eq', NIL)
        this.array.set('__lt', NIL)
        this.array.set('__le', NIL)
        // Concatenation
        this.array.set('__concat', NIL)
        // Length
        this.array.set('__len', NIL)
        // Indexing
        this.array.set('__index', NIL)
        this.array.set('__newindex', NIL)
        // Calls
        this.array.set('__call', NIL)
    }
   
    replace(event: string, f: JSMetaFunctionType) : void {
        if(this.array.has(event)) {
            const fwrapper = new JSMetaFunction(f)
            this.array.set(event, fwrapper)
        } else {
            throw new Error(`Cannot replace ${event} as it is not a valid LUA event`)
        }
    }

    getmeta(event: string) : JSMetaFunctionType | null {
        const v = this.array.get(event)
        if(v===undefined) {
            throw new Error(`Metatable not initialized correctly ${event} is missing`)
        }
        return v.data as null | JSMetaFunctionType
    }
}

export function createEmptyMetatable() : Metatable {
    const t = new Metatable()
    return t
}

export const nilMetatable = createEmptyMetatable()
export const numberMetatable = createEmptyMetatable()
export const boolMetatable = createEmptyMetatable()
export const functionMetatable = createEmptyMetatable()
export const stringMetatable = createEmptyMetatable()
export const tableMetatable = createEmptyMetatable()
export const upvalueMetatable = createEmptyMetatable()
const jsmetaTable = createEmptyMetatable()

export class JSMetaFunction extends LuaValue<JSMetaFunctionType> {
    constructor(data: JSMetaFunctionType) {
        super(EnumLuaValue.JSMetaFunction, jsmetaTable, data)
    }
}