import { LuaValue, EnumLuaValue } from './lua-value'
import { boolMetatable } from './lua-metatable'

export class LuaBool extends LuaValue<boolean> {
    constructor(data: boolean){
        super(EnumLuaValue.LuaBool, boolMetatable, data)
    }
}
