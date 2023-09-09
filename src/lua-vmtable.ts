// Should add a hashing function for the set and get
// so it does not rely on toString()

import { LuaValue, EnumLuaValue } from './lua-value'

export class VMTable {
    array: Map<string, LuaValue<any>>
    constructor(public arrayLength: number, public hashesLength: number) {
        // not sure arraylength or hasheslength needs to be used
        // everything into the map, might conflict, since toString is used for key i think
        this.array = new Map<string, LuaValue<any>>()
    }
    set(index: LuaValue<any>, value: LuaValue<any>) : void {
        if (index.data === null || index === null || index === undefined || value === undefined) {
            throw new Error(`Cannot set arr[${index}] = ${value}`)
        }

        if (value.type === EnumLuaValue.LuaNil) {
            this.array.delete(index.data.toString())
        }
        else {
            this.array.set(index.data.toString(), value)
        }
    }
    get(index: LuaValue<any>) : LuaValue<any> {
        if (index.data === null || index === null || index === undefined) {
            throw new Error(`Cannot get arr[${index}]`)
        }
        const v = this.array.get(index.data.toString())
        if (v === undefined) {
            let displayindex = JSON.stringify(index.data)
            if (index.type === EnumLuaValue.LuaString) {
                displayindex = Buffer.from(index.data as Uint8Array).toString()
            }
            throw new Error(`Array Element ${displayindex} unset. Cannot save undefined in array, so why would you return it.\n${index.data}`)
        }
        return v
    }
}
