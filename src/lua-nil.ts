import { LuaValue, EnumLuaValue } from './lua-value'
import { nilMetatable } from './lua-metatable'

export class LuaNil extends LuaValue<null> {
    constructor(data = null) {
        super(EnumLuaValue.LuaNil, nilMetatable, data)
    }
}
export const NIL = new LuaNil() 

