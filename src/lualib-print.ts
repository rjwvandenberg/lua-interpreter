import { VMExternalClosure, createExternalFunctionPrototype } from './lua-externalclosure'
import { LuaFunction } from './lua-function'
import { LuaValue, EnumLuaValue } from './lua-value'
import { LuaVM } from './lua-vm'

// https://www.lua.org/source/5.1/print.c.html
function loadPrint(vm: LuaVM) : void {
    const printFunction = new LuaFunction(new VMExternalClosure(
        vm.closure.env,
        createExternalFunctionPrototype('print', 0, 1, 0),
        (registers: LuaValue<any>[]) => {
            if (registers[0].type !== EnumLuaValue.LuaString) {
                throw new Error('not implemented :)')
            }
            const v = registers[0].data
            console.log(v)
        }
    ))

    vm.loadLibrary('print', printFunction)
}

export { loadPrint }