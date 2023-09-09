//https://www.lua.org/source/5.1/lmathlib.c.html
import { VMTable } from './lua-vmtable'
import { LuaTable } from './lua-table'
import { LuaString } from './lua-string'
import { LuaFunction } from './lua-function'
import { functionstub, VMExternalClosure, createExternalFunctionPrototype } from './lua-externalclosure'
import { createEmptyMetatable } from './lua-metatable'
import { LuaValue } from './lua-value'
import { LuaVM } from './lua-vm'

function loadMath(vm: LuaVM) : void {

    const rng = {
        state0: 1,
        state1: 2,
        next: () => { return }
    }
    rng.next = () => {
        let s1 = rng.state0
        const s0 = rng.state1
        rng.state0 = s0
        s1 ^= s1 << 23
        s1 ^= s1 >>> 17
        s1 ^= s0
        s1 ^= s0 >> 26
        rng.state1 = s1
    }


    const randomseed = new LuaFunction(new VMExternalClosure(
        vm.closure.env,
        createExternalFunctionPrototype('randomseed', 1, 1, 0),
        (registers: LuaValue<any>[]) => {
            const v = registers[0].data
            rng.state0 = v
            rng.state1 = v
        }
    ))

    const functions = {
        'abs': functionstub,
        'acos': functionstub,
        'asin': functionstub,
        'atan2': functionstub,
        'atan': functionstub,
        'ceil': functionstub,
        'cosh': functionstub,
        'cos': functionstub,
        'deg': functionstub,
        'exp': functionstub,
        'floor': functionstub,
        'fmod': functionstub,
        'frexp': functionstub,
        'ldexp': functionstub,
        'log10': functionstub,
        'log': functionstub,
        'max': functionstub,
        'min': functionstub,
        'modf': functionstub,
        'pow': functionstub,
        'rad': functionstub,
        'random': functionstub,
        'randomseed': randomseed,
        'sinh': functionstub,
        'sin': functionstub,
        'sqrt': functionstub,
        'tanh': functionstub,
        'tan': functionstub,
        'pi': functionstub,
        'huge': functionstub,
    } as {[value: string]: LuaFunction}

    const mathtable = new LuaTable(new VMTable(0,0), createEmptyMetatable())

    for (const key in functions) {
        if (Object.prototype.hasOwnProperty.call(functions, key)) {
            const f = functions[key]
            mathtable.data.set(
                new LuaString(key),
                f
            )
        }
    }

    vm.loadLibrary('math', mathtable)
}

export { loadMath }