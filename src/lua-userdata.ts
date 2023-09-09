import { LuaValue, EnumLuaValue } from './lua-value'
import { Metatable } from './lua-metatable'

export class LuaUserData<T> extends LuaValue<T> {
    constructor(data: T, metatable: Metatable, public name: string) {
        super(EnumLuaValue.LuaUserData, metatable, data)
    }
}
