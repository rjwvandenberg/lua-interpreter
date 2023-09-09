import { LuaValue, EnumLuaValue } from './lua-value'
import { numberMetatable } from './lua-metatable'

export class LuaNumber extends LuaValue<number> {
    constructor(data: number) {
        super(EnumLuaValue.LuaNumber, numberMetatable, data)
    }
}
