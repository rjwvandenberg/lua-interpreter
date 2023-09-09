import { loadLuaC } from './luac-parse'
import { LuaVM } from './lua-vm'
import { start } from 'repl'
import * as path from 'path'
import { Dirent, promises as fs } from 'fs'
import { loadMath } from './lualib-math'
// import { loadAll as PAloadAll } from './lualib-pa'
import { loadString } from './lualib-string'

const basefolder = 'path/to/files/'

const filepaths = [
    'paths/to/luac/testfiles.luac'
]

try {
const vm = runLuaC(filepaths)
    const server = start()
    server.context.vm = vm
} catch(err) {
    console.log(err)
}

async function getFilePaths(entries: Dirent[], folderpath=basefolder) : Promise<string[]> {
    const filepaths: string[] = []
    for(let i = 0; i < entries.length; i++) {
        const e = entries[i]
        if (e.isDirectory()) {
            const dirpath = path.join(folderpath, e.name)
            const fpaths = await getFilePaths(await fs.readdir(dirpath, {withFileTypes: true}), dirpath)
            filepaths.push(...fpaths)
        } else if (e.isFile()) {
            const filepath = path.join(folderpath, e.name)
            filepaths.push(filepath)
        } else {
            throw new Error('Should not encounter non file or directory')
        }
    }
    return filepaths
}

export function runLuaC(filepaths: string[]): LuaVM {
    const vm = new LuaVM(true)

    // lua std libraries
    loadMath(vm)
    loadString(vm)

    // 3rd party c/c++ libarry reimplemented in nodejs to be loaded into the vm, not included here because it contains proprietary data.
    // PAloadAll(vm)

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