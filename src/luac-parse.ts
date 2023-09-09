// http://luaforge.net/docman/83/98/ANoFrillsIntroToLua51VMInstructions.pdf

import * as fs from 'fs'
import { LuaString } from './lua-string'
import { LuaFunctionPrototype } from './lua-function'
import { LuaInt, LuaSize, EnumLuaValue, LuaValue } from './lua-value'
import { LuaNumber } from './lua-number'
import { LuaBool } from './lua-bool'
import { LuaNil } from './lua-nil'


export interface LuaC {
    header: LuaHeader
    topLevelFunction: LuaFunctionPrototype
    fileSize: number
    filePath: string
}

interface LuaHeader {          // for x64 example file
    // lua 5.1 binary header (12 bytes)
    // 4 bytes - signature ("\x1bLua")
    // 1 byte - version (0x51)
    // 1 byte - format (0x00) 0=official version
    // 1 byte - endianness (0x01) 1=little endian
    // 5 bytes - sizes of some types (04 04 04 08 00)
    //                  int, size_t, size of instruction, size of lua_Number, integral flag 0 = floating point 1 = integral number type
    signature: string          // 4    0x1b"LUA"
    version: string            // 1    0x51
    format: number             // 1    0x00    0=official
    endianness: number         // 1    0x01    0=big, 1=little
    int: number                // 1    0x04
    size_t: number             // 1    0x08
    instructionSize: number    // 1    0x04
    luaNumber: number          // 1    0x08
    integral: number           // 1    0x00    0=floating, 1=integral
}

export interface LuaInstruction {
    opcode: number
    A: number
    B: number
    C: number
    Bx: number
    sBx: number
}

export interface LuaLocalVar {
    name: LuaString
    start: LuaInt
    end: LuaInt
}

function readLuaSize(data: Buffer, offset: number, size_t: number) : LuaSize {
    switch(size_t) {
        case 8:
            return data.readBigUInt64LE(offset)
        case 4:
            return BigInt(data.readUInt32LE(offset))
        default:
            throw new Error('Not implemented')
    }
}

function readLuaString(data: Buffer, offset: number, size_t: number) : [LuaString, number] {
    const size = Number(readLuaSize(data, offset, size_t))
    let adj = data[offset+size_t+size-1]===0 ? -1 : 0
    const str = data.slice(offset+size_t, offset+size_t+size+adj).toString('latin1')
    const blockSize = size_t + size

    return [new LuaString(str) , blockSize]
}

function readLuaInt(data: Buffer, offset: number) : LuaInt {
    return data.readInt32LE(offset)
}

function readLuaLocalvar(data: Buffer, offset: number, size_t: number) : [LuaLocalVar, number] {
    const lv = {} as LuaLocalVar
    const strv = readLuaString(data, offset, size_t)
    lv.name = strv[0]
    const blockSize = strv[1]
    lv.start = readLuaInt(data,offset+blockSize)
    lv.end = readLuaInt(data, offset+blockSize+4)
    return [lv, blockSize+8]
}

function readLuaConstant(data: Buffer, offset: number, size_t: number) : [LuaValue<any>, number] {
    let c: LuaValue<any>
    let blockSize = -1
    switch(data[offset]) {
        case EnumLuaValue.LuaNil:
            c = new LuaNil()
            blockSize = 1
            break
        case EnumLuaValue.LuaBool:
            c = new LuaBool(data[offset+1]!==0)
            blockSize = 2
            break
        case EnumLuaValue.LuaNumber:
            c = new LuaNumber(data.readDoubleLE(offset+1))
            blockSize = 9 
            break
        case EnumLuaValue.LuaString: 
            const v = readLuaString(data,offset+1, size_t)
            c = v[0]
            blockSize = v[1]+1
            break
        default:
            throw new Error(`Invalid ${offset}`)
    }
    return [c, blockSize]
}

function readLuaInstruction(data: Buffer, offset: number, instructionSize: number) : LuaInstruction {
    // 3 types
    // opcode A C B
    // opcode A Bx
    // opcode A sBx
    // opcode 6bits
    // A 8 bits
    // B 9 bits
    // C 9 bits
    // Bx 18 bits
    // sBx 18 bits
    // combine BC for now 
    const instruction = data.readUInt32LE(offset)
    const instr = {} as LuaInstruction
    instr.opcode = instruction & 0b111111
    instr.A = (instruction >>> 6) & 0xFF
    instr.B = instruction >>> 23
    instr.C = (instruction >>> 14) & 0b111111111
    instr.Bx = instruction >>> 14
    // sBx1 is not 2's complement
    // -1 encoded as -1 + bias = Bx
    // bias is 0b111111111111111111 >>> 1
    // sBx + bias = Bx
    // sBx = Bx - bias
    // I think.
    // so range -131071 to 131072
    instr.sBx = instr.Bx - (0b111111111111111111 >>> 1)
    return instr
}

function readLuaFunctionPrototype(data: Buffer, offset: number, header: LuaHeader, toplevel: boolean) : [LuaFunctionPrototype, number] {
    const startoffset = offset
    const f = {} as LuaFunctionPrototype
    try {
        f.toplevel = toplevel
        const v = readLuaString(data, offset, header.size_t)
        f.sourceName = v[0]
        offset += v[1]
        f.line = readLuaInt(data,offset)
        offset+=4
        f.lastline = readLuaInt(data,offset)
        offset+=4
        f.upvaluesCount = data[offset]
        f.parametersCount = data[offset+1]
        f.varArg = data[offset+2]
        f.registersCount = data[offset+3]
        offset+=4
        f.instructionsCount = readLuaInt(data,offset)
        offset+=4
        if (f.instructionsCount <= 0) {
            throw new Error('Expected at least 1 instruction, RETURN')
        }
        f.instructions = []
        for (let i = 0; i < f.instructionsCount; i++) {
            const instr = readLuaInstruction(data,offset,header.instructionSize)
            f.instructions.push(instr)
            offset+=header.instructionSize
        }
        f.constantsCount = readLuaInt(data,offset)
        offset+=4
        f.constants = []
        for (let i =0; i < f.constantsCount; i++) {
            const c = readLuaConstant(data,offset, header.size_t)
            f.constants.push(c[0])
            offset += c[1]
        }
        f.functionPrototypesCount = readLuaInt(data,offset)
        offset+=4
        f.functionPrototypes = []
        for (let i = 0; i < f.functionPrototypesCount; i++) {
            const fproto = readLuaFunctionPrototype(data, offset, header, false)
            f.functionPrototypes.push(fproto[0])
            offset += fproto[1]
        }
        // debug info
        f.lineinfoCount = readLuaInt(data,offset)
        offset+=4
        f.lineinfoList = []
        for (let i = 0; i < f.lineinfoCount; i++) {
            f.lineinfoList.push(readLuaInt(data,offset))
            offset += 4
        }
        f.localvarCount = readLuaInt(data, offset)
        offset += 4
        f.localvarList = []
        for (let i = 0; i < f.localvarCount; i++) {
            const localvar = readLuaLocalvar(data, offset, header.size_t)
            f.localvarList.push(localvar[0])
            offset += localvar[1]
        }
        f.upvalueCount = readLuaInt(data,offset)
        offset += 4
        f.upvalueList = []
        for (let i = 0; i < f.upvalueCount; i++) {
            const upvalue = readLuaString(data, offset, header.size_t)
            f.upvalueList.push(upvalue[0])
            offset += upvalue[1]
        }
    } catch (e) {
        console.log(e)
        console.log(offset)
        process.exit()
    }
    return [f, offset-startoffset]
}

function readLuaHeader(data: Buffer, offset: number) : LuaHeader {
    return {
        signature: data.slice(offset+0,offset+4).toString('latin1'),
        version: data[offset+4].toString(16),
        format: data[offset+5],
        endianness: data[offset+6],
        int: data[offset+7],
        size_t: data[offset+8],
        instructionSize: data[offset+9],
        luaNumber: data[offset+10],
        integral: data[offset+11],
    }
}

export function loadLuaC(luacpath: string, ) : LuaC {
    const data = fs.readFileSync(luacpath)
    
    const luac = {} as LuaC
    luac.filePath = luacpath
    luac.fileSize = data.length

    let offset = 0
    
    luac.header = readLuaHeader(data, offset)
    offset += 12

    if (luac.header.int !== 4) {
        throw new Error('Not implemented')
    }
    if (luac.header.instructionSize !== 4) {
        throw new Error('Not implemented')
    }
    if (luac.header.luaNumber !== 8) {
        throw new Error('Not implemented')
    }
    if (luac.header.endianness !== 1) {
        throw new Error('Not implemented')
    }
    if (luac.header.integral !== 0) {
        throw new Error('Not implemented')
    }
    if (luac.header.format !== 0) {
        throw new Error('Not implemented')
    }

    const f = readLuaFunctionPrototype(data, offset, luac.header, true)
    luac.topLevelFunction = f[0]
    offset += f[1]

    if (offset !== data.length) {
        throw new Error(`There is more after ${offset}`)
    }

    return luac
}