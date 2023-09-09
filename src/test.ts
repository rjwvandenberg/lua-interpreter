import { start } from 'repl'
import { LuaVM } from './lua-vm'
import { loadMath } from './lualib-math'
import { loadString } from './lualib-string'
import { loadLuaC } from './luac-parse'
import { loadPrint } from './lualib-print'
import { loadBase } from './lualib-base'

const filepaths = [
    'Path to compiled lua file',
]

try {
const vm = runLuaC(filepaths)
    const server = start()
    server.context.vm = vm
} catch(err) {
    console.log(err)
}

function runLuaC(filepaths: string[]): LuaVM {
    const vm = new LuaVM(true)

    loadMath(vm)
    loadString(vm)
    loadPrint(vm)
    loadBase(vm)

    let keepGoing = true
    for(let i = 0; i < filepaths.length && keepGoing; i++){
        const luac = loadLuaC(filepaths[i])
        try {
            vm.run(luac, filepaths[i])
        } catch(err) {
            console.log(err.message)
            keepGoing=false
        }
    }

    return vm
}