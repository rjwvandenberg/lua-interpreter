import { Metatable } from './lua-metatable'

//export type LuaValueType = LuaNil | LuaBool | LuaNumber | LuaString | LuaUserData<any> | LuaTable | LuaFunction | JSMetaFunction
//export type LuaValueDataType = null | boolean | number | Uint8Array | VMTable | VMClosure | JSMetaFunctionType | LuaValue
export type LuaSize = BigInt
export type LuaInt = number

export abstract class LuaValue<T> {
    constructor(public type: EnumLuaValue, public metatable: Metatable, public data: T){}
}

export enum EnumLuaValue {
    LuaNil = 0,
    LuaBool = 1,
    LuaNumber = 3,
    LuaString = 4,
    LuaTable = 5,
    LuaFunction = 6,
    LuaUserData = 7,
    LuaThread = 8,
    LuaUpValue = 100,
    JSMetaFunction = 1234,
}