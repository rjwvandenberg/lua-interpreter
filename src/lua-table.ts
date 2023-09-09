import { VMTable } from './lua-vmtable'
import { LuaValue, EnumLuaValue } from './lua-value'
import { tableMetatable, Metatable } from './lua-metatable'

export class LuaTable extends LuaValue<VMTable> {
    constructor(data: VMTable, metatable: Metatable = tableMetatable) {
        super(EnumLuaValue.LuaTable, metatable, data)
    }
}