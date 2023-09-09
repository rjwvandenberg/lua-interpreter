import { LuaValue, EnumLuaValue } from './lua-value'
import { stringMetatable } from './lua-metatable'

export class LuaString extends LuaValue<string> {
    constructor(data: string) {
        super(EnumLuaValue.LuaString, stringMetatable, data)
    }
}
