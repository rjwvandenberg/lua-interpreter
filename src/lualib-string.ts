import { LuaString } from './lua-string'
import { functionstub, VMExternalClosure } from './lua-externalclosure'
import { LuaTable } from './lua-table'
import { VMTable } from './lua-vmtable'
import { createEmptyMetatable } from './lua-metatable'
import { LuaFunction } from './lua-function'
import { LuaVM } from './lua-vm'

// https://www.lua.org/source/5.1/lstrlib.c.html


function loadString(vm: LuaVM) : void {
    const functions = {
        'byte': functionstub,
        'char': functionstub,
        'dump': functionstub,
        'find': functionstub,
        'format': functionstub,
        'gfind': functionstub,
        'gmatch': functionstub,
        'gsub': functionstub,
        'len': functionstub,
        'lower': functionstub,
        'match': functionstub,
        'rep': functionstub,
        'reverse': functionstub,
        'sub': functionstub,
        'upper': functionstub,
        'NULL': functionstub
    } as {[key:string]: LuaFunction}

    const stringtable = new LuaTable(new VMTable(0,0), createEmptyMetatable())

    for (const key in functions) {
        if (Object.prototype.hasOwnProperty.call(functions, key)) {
            const f: LuaFunction = functions[key]
            stringtable.data.set(
                new LuaString(key),
                f
            )
        }
    }

    vm.loadLibrary('string', stringtable)
}

export { loadString }