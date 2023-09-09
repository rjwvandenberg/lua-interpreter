// http://luaforge.net/docman/83/98/ANoFrillsIntroToLua51VMInstructions.pdf vm isntructions
// https://www.lua.org/manual/5.1/manual.html api

// https://www.lua.org/doc/jucs05.pdf vm

// probably contains many errors in terms of copying reference instead of deepclone {type:luavalue,data;luadatavalue}

import { LuaC } from './luac-parse'
import { LuaNumber } from './lua-number'
import { LuaBool } from './lua-bool'
import { LuaNil } from './lua-nil'
import { LuaString } from './lua-string'
import { VMTable } from './lua-vmtable'
import { LuaTable } from './lua-table'
import { VMClosure } from './lua-vmclosure'
import { LuaValue, EnumLuaValue } from './lua-value'
import { LuaFunction } from './lua-function'

const iSTR = [
	'MOVE A B',                 //  0 Copy a value between registers
	'LOADK A Bx',                //  1 Load a constant into a register
	'LOADBOOL A B C',             //  2 Load a boolean into a register
	'LOADNIL A B',              //  3 Load nil values into a range of registers
	'GETUPVAL A B',             //  4 Read an upvalue into a register
	'GETGLOBAL A Bx',            //  5 Read a global variable into a register
	'GETTABLE A B C',             //  6 Read a table element into a register
	'SETGLOBAL A Bx',            //  7 Write a register value into a global variable
	'SETUPVAL A B',             //  8 Write a register value into an upvalue
	'SETTABLE A B C',             //  9 Write a register value into a table element
	'NEWTABLE A B C',             // 10 Create a new table
	'SELF A B C',                 // 11 Prepare an object method for calling
	'ADD A B C',                  // 12 Addition operator
	'SUB A B C',                  // 13 Subtraction operator
	'MUL A B C',                  // 14 Multiplication operator
	'DIV A B C',                  // 15 Division operator
	'MOD A B C',                  // 16 Modulus (remainder) operator
	'POW A B C',                  // 17 Exponentiation operator
	'UNM A B',                  // 18 Unary minus operator
	'NOT A B',                  // 19 Logical NOT operator
	'LEN A B',                  // 20 Length operator
	'CONCAT A B C',               // 21 Concatenate a range of registers
	'JMP sBx',                  // 22 Unconditional jump
	'EQ A B C',                   // 23 Equality test
	'LT A B C',                   // 24 Less than test
	'LE A B C',                   // 25 Less than or equal to test
	'TEST A C',                 // 26 Boolean test, with conditional jump
	'TESTSET',              // 27 Boolean test, with conditional jump and assignment
	'CALL A B C',                 // 28 Call a closure
	'TAILCALL A B C',             // 29 Perform a tail call
	'RETURN A B',               // 30 Return from function call
	'FORLOOP A sBx',              // 31 Iterate a numeric for loop
	'FORPREP A sBx',              // 32 Initialization for a numeric for loop
	'TFORLOOP',             // 33 Iterate a generic for loop
	'SETLIST A B C',              // 34 Set a range of array elements for a table
	'CLOSE A',                // 35 Close a range of locals being used as upvalues
	'CLOSURE A Bx',              // 36 Create a closure of a function prototype
	'VARARG',               // 37 Assign vararg function arguments to registers
]

const RKMSB = 0b100000000	// RK most significant bit
const FPF = 50  // Fields per Flush (setlist)

export class LuaVM {
	globals: Map<string, LuaValue<any>>
    functionStack: {closure: VMClosure}[]
	closure: VMClosure 
	backlog: string[]
    constructor(
        public verbose = false,
    ) {
        this.globals = new Map<string, LuaValue<any>>()
        this.closure = {enclosingA: 0, enclosingC: 1} as VMClosure
		this.functionStack = []
		this.backlog = []

		// Assign globals table to global _G
		const _G = new VMTable(0,0)
		_G.array = this.globals
		this.loadLibrary('_G', new LuaTable(_G))
    }

    run(luac: LuaC, name: string) : void {
		// Create top-level closure
		if (this.closure.setup) {
			this.closure.setup(0,1)
			this.functionStack.push({closure: this.closure})
			this.closure = new VMClosure(luac.topLevelFunction, this.closure.env)
			return
		}
		const globalenv = new VMTable(0,0)
		globalenv.array = this.globals
		this.closure = new VMClosure(luac.topLevelFunction, globalenv)
		
		const MAXINSTRUCTIONS = 10000000
		let keepGoing = true
		try {
			let i = 0
			while(i < MAXINSTRUCTIONS && keepGoing) {
				keepGoing = this.nextInstruction()
				i++
			}
			if (i === MAXINSTRUCTIONS) {
				throw new Error('Reached MAXINSTRUCTIONS, check backlog')
			}
		} catch(e) {
			
			console.log(this.backlog.slice(this.backlog.length-80,this.backlog.length).join('\n'))
			const instr = this.closure.functionPrototype.instructions[this.closure.pc-1]
			console.log('luac file: ' + name)
			console.log(e)
			console.log(`[${this.closure.pc-1}] [${instr.opcode}] ${iSTR[instr.opcode]}:  ${JSON.stringify(instr)}`)
			throw new Error('Stopping execution')
		}
    }

    loadLibrary(name: string, globaldata: LuaValue<any>) : void {
		this.globals.set(name, globaldata)
    }

    nextInstruction() : boolean {
		const instruction = this.closure.nextInstruction()
		let keepGoing = true

		switch (instruction.opcode) {
		case 0: this.instructionMove(instruction.opcode, instruction.A, instruction.B); break
		case 1: this.instructionLoadK(instruction.opcode, instruction.A, instruction.Bx); break
		case 2: this.instructionLoadBool(instruction.opcode, instruction.A, instruction.B, instruction.C); break
		case 3: this.instructionLoadNil(instruction.opcode, instruction.A, instruction.B); break
		case 4: this.instructionGetUpval(instruction.opcode, instruction.A, instruction.B); break
		case 5: this.instructionGetGlobal(instruction.opcode, instruction.A, instruction.Bx); break
		case 6: this.instructionGetTable(instruction.opcode, instruction.A, instruction.B, instruction.C); break
		case 7: this.instructionSetGlobal(instruction.opcode, instruction.A, instruction.Bx); break
		case 8: this.instructionSetUpval(instruction.opcode, instruction.A, instruction.B); break
		case 9: this.instructionSetTable(instruction.opcode, instruction.A, instruction.B, instruction.C); break
		case 10: this.instructionNewTable(instruction.opcode, instruction.A,instruction.B,instruction.C); break
		case 11: this.instructionSelf(instruction.opcode, instruction.A,instruction.B,instruction.C); break
		case 12: this.instructionAdd(instruction.opcode, instruction.A,instruction.B,instruction.C); break
		case 13: this.instructionSub(instruction.opcode, instruction.A,instruction.B,instruction.C); break
		case 14: this.instructionMul(instruction.opcode, instruction.A,instruction.B,instruction.C); break
		case 15: this.instructionDiv(instruction.opcode, instruction.A,instruction.B,instruction.C); break
		case 16: this.instructionMod(instruction.opcode, instruction.A,instruction.B,instruction.C); break
		case 17: this.instructionPow(instruction.opcode, instruction.A,instruction.B,instruction.C); break
		case 18: this.instructionUnm(instruction.opcode, instruction.A, instruction.B); break
		case 19: this.instructionNot(instruction.opcode, instruction.A, instruction.B); break
		case 20: this.instructionLen(instruction.opcode, instruction.A, instruction.B); break
		case 21: this.instructionConcat(instruction.opcode, instruction.A,instruction.B,instruction.C); break
		case 22: this.instructionJmp(instruction.opcode, instruction.sBx); break
		case 23: this.instructionEq(instruction.opcode, instruction.A, instruction.B, instruction.C); break
		case 24: this.instructionLt(instruction.opcode, instruction.A, instruction.B, instruction.C); break
		case 25: this.instructionLe(instruction.opcode, instruction.A, instruction.B, instruction.C); break
		case 26: this.instructionTest(instruction.opcode, instruction.A, instruction.C); break
		case 27: this.instructionTestSet(); break
		case 28: this.instructionCall(instruction.opcode, instruction.A, instruction.B, instruction.C); break
		case 29: this.instructionTailCall(instruction.opcode, instruction.A, instruction.B, instruction.C); break
		case 30: keepGoing = this.instructionReturn(instruction.opcode, instruction.A, instruction.B); break
		case 31: this.instructionForLoop(instruction.opcode, instruction.A, instruction.sBx); break
		case 32: this.instructionForPrep(instruction.opcode, instruction.A, instruction.sBx); break
		case 33: this.instructionTForLoop(); break
		case 34: this.instructionSetList(instruction.opcode, instruction.A, instruction.B, instruction.C); break
		case 35: this.instructionClose(instruction.opcode, instruction.A); break
		case 36: this.instructionClosure(instruction.opcode, instruction.A, instruction.Bx); break
		case 37: this.instructionVarArg(); break
		default: throw new Error('Invalid opcode')
		}

		return keepGoing
    }

    globalGet(name: LuaString) : LuaValue<any> {
		const v = this.globals.get(name.data)
		if (v === undefined) {
			throw new Error(`Global ${name.data} is unset`)
		}
		return v
    }
    globalSet(name: LuaString, value: LuaValue<any>) : void {
		if(name === null || name === undefined || value === undefined) {
			throw new Error(`Cannot set global ${name.data} to ${value}`)
		}
		this.globals.set(name.data, value)
	}

    instructionVarArg() : void {
		throw new Error('Method not implemented.')
    }
    instructionClosure(opcode: number, A: number, Bx: number) : void {
		// Create a closure of a function Bx in register A
		const closure = new VMClosure(this.closure.functionPrototype.functionPrototypes[Bx], this.closure.env)
		
		// Upvalue implementation
		// For each upvalue used by the closure, there is a pseudo-instruction that follows CLOSURE
		// Each upvalue corresponds to either
		//  - MOVE		B
		//  - GETUPVAL	B
		// Move corresponds to local variable R(B) in the current block which will be used as 
		// 			upvalue in CLOSURE
		// Getupval corresponds upvalue number B in the current block

		// If CLOSURE has no upvalues, R(A) is instantiated with the function object

		if (this.verbose) {
			this.log(opcode, A, Bx, `  R(${A}) = closure.functionPrototype.functionPrototypes[${Bx}]`)
		}

		for (let i = 0; i<closure.functionPrototype.upvaluesCount; i++) {
			const instr = this.closure.nextInstruction()
			if (instr.opcode===0) {
				// MOVE B   local var B used as upvalue in closure
				closure.upvalueNew(i, this.closure, instr.B)
				if (this.verbose) {
					this.log(instr.opcode, instr.B, `   new upvalue to ${i} from register ${instr.B}`)
				}
			} else if (instr.opcode===4) {
				// GETUPVAL B   upvalue B in closure
				const upv = this.closure.upvalueRef(instr.B)
				if (upv.type !== EnumLuaValue.LuaUpValue) {
					throw new Error(`Expected upvalue in register ${instr.B}, got ${EnumLuaValue[upv.type]}`)
				}
				closure.upvalues[i] = upv
				if (this.verbose) {
					this.log(instr.opcode, instr.B, `   copied upvalue to ${i} from upvalue ${instr.B}`)
				}
			} else {
				throw new Error('Not enough move/getupval instructions after closure to cover upvalues')
				// next = false
				// this.closure.jmp(-1)
			}
		}

		this.closure.registerSet(A, new LuaFunction(closure))
    }
    instructionClose(opcode: number, A: number) : void {
		for (let i = A; i < this.closure.functionPrototype.upvaluesCount; i++){
			this.closure.upvalueRef(i).close(this.closure, A)
		}
		// think this is not going as expected, since 
		//   [12]  [35] CLOSE A:             6        close local upvalues for R(6) onwards
		// will not close any locals in functionprototypes created past the current prototype?
		if (this.verbose) {
			this.log(opcode, A, `     close local upvalues for R(${A}) onwards`)
		}
    }
    instructionSetList(opcode: number, A: number, B: number, C: number) : void {
		// Set the values for a range of elements in a table in register A
		// B is the number of elements to set
		// C encodes the block number of the table to be initialized
		// The values used to initialize are R(A+1+i)...
		if (B==0) {
			throw new Error('not implemented')
		}
		let blocknumber = C
		if (C==0) {
			// next instruction is u32, so retrieve it and skip to next instruction
			const encodedC = this.closure.functionPrototype.instructions[this.closure.pc]
			blocknumber = encodedC.opcode + (encodedC.A<<6) + (encodedC.Bx<<14)
		}
		const twrap = this.closure.registerGet(A)
		if (twrap.type !== EnumLuaValue.LuaTable) {
			throw new Error(`Expected table, got ${EnumLuaValue[twrap.type]} ${JSON.stringify(twrap)}`)
		}
		const table = twrap.data as VMTable
		const indexbase = (blocknumber-1)*FPF+1
		for (let i = 0; i < B; i++) {
			const v = this.closure.registerGet(A+1+i)
			const index = indexbase+i
			table.set(new LuaNumber(index), v)
		}
		if (this.verbose) {
			this.log(opcode, A, B, C, `  table[${indexbase}...] = R(${A+1}+i.... ${A+B})`)
		}

		if (C==0) {
			this.closure.jmp(1)
		}
    }
    instructionTForLoop() : void {
		throw new Error('Method not implemented.')
    }
    instructionForPrep(opcode: number, A: number, sBx: number) : void {
		const v1 = this.closure.registerGet(A+2)
		const v2 = this.closure.registerGet(A)
		const r = v2.data - v1.data
		if (this.verbose) {
			this.log(opcode, A, sBx, `  R(${A}) -= R(${A+2}) (${r}); PC += ${sBx}`)
		}
		this.closure.registerSet(A, new LuaNumber(r))
		this.closure.jmp(sBx)
		
    }
    instructionForLoop(opcode: number, A: number, sBx: number) : void {
		const v1 = this.closure.registerGet(A+2)
		const v2 = this.closure.registerGet(A)
		const r = v2.data + v1.data
		this.closure.registerSet(A, new LuaNumber(r))

		const v3 = this.closure.registerGet(A+1)
		if (this.verbose) {
			this.log(opcode, A, sBx, `  if (${v2.data} <= ${v3.data}) then pc += ${sBx}; R(${A+3}) = ${v2.data}`)
		}
		if (v2.data <= v3.data) {
			this.closure.jmp(sBx)
			this.closure.registerSet(A+3, v2)
		}
		
    }
    instructionReturn(opcode: number, A: number, B: number) : boolean {
		// Return to the calling function with results
		// if B==1 no results
		// if B>1  B-1 results from register A onwards
		// if B==0 values A to top of the stack are returned
		// if(B===0) {
		// 	throw new Error('Method not implemented')
		// }

		const closure = this.closure
		const topFunction = this.functionStack.pop()
		if (!topFunction) {
			if (B!==1) {
				throw new Error(`Not implemented End of program, expected 0 return values, got B${B} check backlog for details`)
			}
			this.log(opcode, A, B, '   End of Luac File', Buffer.from(this.closure.functionPrototype.sourceName.data).toString())
			closure.cleanup()
			this.closure = {} as VMClosure
			return false
		}
		const enclosingClosure = topFunction.closure

		const closureResultCount = B==0 ? closure.functionPrototype.registersCount-A : B-1
		let resultCount = closure.enclosingC==0 ? 1+enclosingClosure.functionPrototype.registersCount-closure.enclosingA : closure.enclosingC-1
		if (closure.enclosingC===0 && resultCount > closureResultCount) { 
			resultCount = closureResultCount
			// that's ok, continue
		} else if (resultCount > closureResultCount && resultCount > closure.functionPrototype.registersCount) {
			this.functionStack.push(topFunction)
			throw new Error(`Mismaching expectations in result: \n  closureResultCount ${closureResultCount}\n  resultCount: ${resultCount}`)
		}

		for(let i = 0; i < resultCount; i++) {
			const v = closure.registerGet(A + i)
			enclosingClosure.registerSet(closure.enclosingA+i, v)
		}

		if (this.verbose) {
			this.log(opcode, A, B, `  Return ${A} ${B}`)
		}

		closure.cleanup()
		this.closure = enclosingClosure

		return true
    }
    instructionTailCall(opcode: number, A: number, B: number, C: number) : void {
		if (C !== 0) {
			throw new Error('Expected C === 0. See documentation')
		}
		if (B===0) {
			throw new Error('Method not implemented')
		}
		// return R(A)(R(A+1)... R(A+B-1)
		// this closure is done, so we can replace it with R(A) tailclosure
		// registers need to be set to A+1 .. A+B-1
		// need to setup return args correctly
		const replacedClosure = this.closure
		const enclosingClosure = this.functionStack[this.functionStack.length-1].closure
		const tailClosureWrap = this.closure.registerGet(A)
		const tailClosure = tailClosureWrap.data as VMClosure
		if(tailClosureWrap.type !== EnumLuaValue.LuaFunction) {
			throw new Error(`Expected LuaFunction, got ${EnumLuaValue[tailClosureWrap.type]} ${JSON.stringify(tailClosureWrap)}`)
		}

		// check that resulsts count expected matches tailclosure results returned
		const resultCount = replacedClosure.enclosingC==0 ? 1+enclosingClosure.functionPrototype.registersCount-replacedClosure.enclosingA : replacedClosure.enclosingC-1
		if (resultCount > tailClosure.functionPrototype.registersCount && resultCount > tailClosure.functionPrototype.registersCount) {
			throw new Error(`Mismaching expectations in result: \n  registers of tailcount ${tailClosure.functionPrototype.registersCount}\n  expected resultCount: ${resultCount}`)
		}

		// copy arguments and upvalues?
		const argumentCount = B==0 ? replacedClosure.functionPrototype.registersCount-A : B-1
		for(let i = 0; i < argumentCount; i++) {
			const v = replacedClosure.registerGet(A+1+i)
			tailClosure.registerSet(i, v)
		}

		for (let i = 0; i < tailClosure.functionPrototype.upvaluesCount; i++){
			const v = tailClosure.upvalueGet(i)
			tailClosure.registerSet(argumentCount + i, v)
		}

		tailClosure.setup(replacedClosure.enclosingA, replacedClosure.enclosingC)

		if (this.verbose) {
			this.log(opcode, A, B, C, `  TailCall function in R(${A}), replacing current closure`)
		}

		this.closure = tailClosure
		// need to cleanup, resetting pc in case register A contains the same vmclosure we just used
		replacedClosure.cleanup()
    }
    instructionCall(opcode: number, A: number, B: number, C: number) : void {
		// Call function in register A
		// if B==1 no parameters
		// if B>1  B-1 parameters
		// if B==0 the parameters range from R(A+1) to the top of the stack 
		// parameters are located after register A, if(B>1): register A+1 .. A+B-1
		
		// if(B===0 || C===0) {
		// 	throw new Error('Method not implemented')
		// }
		
		// Results returned by the function are placed in registers starting from R(A)
		// if C==1 no results
		// if C>1  C-1 results
		// if C==0 multiple results depending on the function called
		const enclosingClosure = this.closure
		const cwrap = enclosingClosure.registerGet(A)
		if(cwrap.type !== EnumLuaValue.LuaFunction) {
			throw new Error(`Expected LuaFunction, got ${EnumLuaValue[cwrap.type]} ${JSON.stringify(cwrap)}`)
		}

		if (this.verbose) {
			this.log(opcode, A, B, C, `  Call function in R(${A})`)
		}

		const closure = cwrap.data as VMClosure
		const argumentCount = B==0 ? this.closure.functionPrototype.registersCount-A : B-1
		// not needed here, just for return
		//const resultCount = C==0 ? 1+this.closure.functionPrototype.registersCount-A : C-1
		for(let i = 0; i < argumentCount; i++) {
			const v = enclosingClosure.registerGet(A+1+i)
			closure.registerSet(i, v)
		}

		// Think upvalues are copied after arguments into the registers
		// use upvalue, or the data referenced by the upvalue?
		// guessing the data is fine, since upvalue 
		for (let i = 0; i < closure.functionPrototype.upvaluesCount; i++){
			const v = closure.upvalueGet(i)
			closure.registerSet(argumentCount + i, v)
		}
		
		closure.setup(A, C)

		this.functionStack.push({closure: enclosingClosure})
		this.closure = closure
    }
    instructionTestSet() : void {
		throw new Error('Method not implemented.')
    }
    instructionTest(opcode: number, A: number, C: number) : void {
		// if not (R(A) === C) then PC++
		// R(A) is coerced to boolean value
		const c1 = this.closure.registerGet(A)
		if (c1.type !== EnumLuaValue.LuaBool) {
			console.log(c1)
			throw new Error('type coercion not implemented')
		}
		const ctruth = C !== 0
		if ( c1.data !== ctruth) {
			this.closure.jmp(1)
		}

		if (this.verbose) {
			this.log(opcode, A, C, `  if (${c1.data} !== ${ctruth}) then pc++`)
		}
    }
    instructionLe(opcode: number, A: number, B: number, C: number) : void {
		throw new Error('Method not implemented.')
		if (this.verbose) {
			this.log(opcode, A, B, C, `  R(${A}) =`)
		}
    }
    instructionLt(opcode: number, A: number, B: number, C: number) : void {
		throw new Error('Method not implemented.')
		if (this.verbose) {
			this.log(opcode, A, B, C, `  R(${A}) = `)
		}
    }
    instructionEq(opcode: number, A: number, B: number, C: number) : void {
		// eq a b c  if ((c1 == c1) ~= A) then pc++
		const c1 = this.rk(B)
		const c2 = this.rk(C)
		const eq = (c1.type===c2.type) && (c1.data === c2.data)
		const a_truth = A !== 0
		if (eq !== a_truth) {
			this.closure.jmp(1)
		}

		if (this.verbose) {
			this.log(opcode, A, B, C, `  if (${EnumLuaValue[c1.type]} ${c1.data} === ${EnumLuaValue[c2.type]} ${c2.data}) !== ${a_truth}) pc++   ${eq!==a_truth} `)
		}
    }
    instructionJmp(opcode: number, sBx: number) : void {
		// increase pc by sBx
		if (this.verbose) {
			this.log(opcode, sBx, `  pc+=${sBx}`)
		}
		this.closure.jmp(sBx)
    }
    instructionConcat(opcode: number, A: number, B: number, C: number) : void {
		// Concatenate (R(B..C)) and assign result to A
		throw new Error('method not implemented need to swap to uint8array and luastring or something')
		let v = ''
		for(let i = B; B <= C; i++){
			const c = this.closure.registerGet(i)
			if(!(c instanceof String)) {
				throw new Error(`Cannot concat non string ${i}`)
			}
			v += c
		}
		//this.closure.registerSet(A, v)
		if (this.verbose) {
			// rewrite?
			//this.log(opcode, A, B, C, `  R(${B}..${C})`)
		}
    }
    instructionLen(opcode: number, A: number, B: number) : void {
		// assign length of object in register B to register A
		// strings: string.length + 1 (removed \x00)
		// table: tablesize as defined in lua
		// objects: call methamethod
		throw new Error('Method not implemented')
		let c = -1
		//this.closure.registerSet(A, c)
		if (this.verbose) {
			//this.log(opcode, A, B, `  R(${A}) = R(${B}).length`)
		}
    }
    instructionNot(opcode: number, A: number, B: number) : void {
		// negate value of register b and assign to register a
		// may also accept numbers?
		const c = this.closure.registerGet(B)
		if(c.type !== EnumLuaValue.LuaBool) {
			throw new Error(`Cannot negate non boolean R(${B})`)
		}
		this.closure.registerSet(A, new LuaBool(!c.data) )
		if (this.verbose) {
			this.log(opcode, A, B, `  R(${A}) = ${!c.data}`)
		}
    }
    instructionUnm(opcode: number, A: number, B: number) : void {
		// copy R(B) into R(A) negated
		const c = this.closure.registerGet(B)
		if(c.type !== EnumLuaValue.LuaNumber) {
			const f = c.metatable.getmeta('__unm')
			if (f===null) {
				throw new Error(`__unm not implemented for ${EnumLuaValue[c.type]} ${JSON.stringify(c)}`)
			} else {
				this.closure.registerSet(A, f(c))
			}
		} else {
			this.closure.registerSet(A, new LuaNumber(-c.data))
			if (this.verbose) {
				this.log(opcode, A, B, `  R(${A}) = ${-c.data}`)
			}
		}
    }
    instructionPow(opcode: number, A: number, B: number, C: number) : void {
		const c1 = this.rk(B)
		const c2 = this.rk(C)
		if(c1.type!==c2.type) {
			throw new Error(`Coercion of types not implemented`)
		}
		if(c1.type !== EnumLuaValue.LuaNumber) {
			const f = c1.metatable.getmeta('__pow')
			if (f===null) {
				throw new Error(`__pow not implemented for ${EnumLuaValue[c1.type]} ${JSON.stringify(c1)}`)
			} else {
				this.closure.registerSet(A, f(c1, c2))
			}
		} else {
			this.closure.registerSet(A, new LuaNumber(c1.data**c2.data))
			if (this.verbose) {
				this.log(opcode, A, B, C, `  R(${A}) = ${c1.data} ** ${c2.data} = ${c1.data**c2.data}`)
			}	
		}
    }
    instructionMod(opcode: number, A: number, B: number, C: number) : void {
		const c1 = this.rk(B)
		const c2 = this.rk(C)
		if(c1.type!==c2.type) {
			throw new Error(`Coercion of types not implemented`)
		}
		if(c1.type !== EnumLuaValue.LuaNumber) {
			const f = c1.metatable.getmeta('__mod')
			if (f===null) {
				throw new Error(`__mod not implemented for ${EnumLuaValue[c1.type]} ${JSON.stringify(c1)}`)
			} else {
				this.closure.registerSet(A, f(c1, c2))
			}
		} else {
			this.closure.registerSet(A, new LuaNumber(c1.data%c2.data))
			if (this.verbose) {
				this.log(opcode, A, B, C, `  R(${A}) = ${c1.data} % ${c2.data} = ${c1.data%c2.data}`)
			}
		}
    }
    instructionDiv(opcode: number, A: number, B: number, C: number) : void {
		const c1 = this.rk(B)
		const c2 = this.rk(C)
		if(c1.type!==c2.type) {
			throw new Error(`Coercion of types not implemented`)
		}
		if(c1.type !== EnumLuaValue.LuaNumber) {
			const f = c1.metatable.getmeta('__div')
			if (f===null) {
				throw new Error(`__div not implemented for ${EnumLuaValue[c1.type]} ${JSON.stringify(c1)}`)
			} else {
				this.closure.registerSet(A, f(c1, c2))
			}
		} else {
			this.closure.registerSet(A, new LuaNumber(c1.data/c2.data))
			if (this.verbose) {
				this.log(opcode, A, B, C, `  R(${A}) = ${c1.data} / ${c2.data} = ${c1.data/c2.data}`)
			}
		}
    }
    instructionMul(opcode: number, A: number, B: number, C: number) : void {
		const c1 = this.rk(B)
		const c2 = this.rk(C)
		if(c1.type!==c2.type) {
			throw new Error(`Coercion of types not implemented`)
		}
		if(c1.type !== EnumLuaValue.LuaNumber) {
			const f = c1.metatable.getmeta('__mul')
			if (f===null) {
				throw new Error(`__mul not implemented for ${EnumLuaValue[c1.type]} ${JSON.stringify(c1)}`)
			} else {
				this.closure.registerSet(A, f(c1, c2))
			}
		} else {
			this.closure.registerSet(A, new LuaNumber(c1.data*c2.data))
			if (this.verbose) {
				this.log(opcode, A, B, C, `  R(${A}) = ${c1.data} * ${c2.data} = ${c1.data*c2.data}`)
			}
		}
    }
    instructionSub(opcode: number, A: number, B: number, C: number) : void {
		const c1 = this.rk(B)
		const c2 = this.rk(C)
		if(c1.type!==c2.type) {
			throw new Error(`Coercion of types not implemented`)
		}
		if(c1.type !== EnumLuaValue.LuaNumber) {
			const f = c1.metatable.getmeta('__sub')
			if (f===null) {
				throw new Error(`__sub not implemented for ${EnumLuaValue[c1.type]} ${JSON.stringify(c1)}`)
			} else {
				this.closure.registerSet(A, f(c1, c2))
			}
		} else {
			this.closure.registerSet(A, new LuaNumber(c1.data-c2.data))
			if (this.verbose) {
				this.log(opcode, A, B, C, `  R(${A}) = ${c1.data} - ${c2.data} = ${c1.data-c2.data}`)
			}
		}		
    }
    instructionAdd(opcode: number, A: number, B: number, C: number) : void {
		const c1 = this.rk(B)
		const c2 = this.rk(C)
		if(c1.type!==c2.type) {
			throw new Error(`Coercion of types not implemented`)
		}
		if(c1.type !== EnumLuaValue.LuaNumber) {
			const f = c1.metatable.getmeta('__add')
			if (f===null) {
				throw new Error(`__add not implemented for ${EnumLuaValue[c1.type]} ${JSON.stringify(c1)}`)
			} else {
				this.closure.registerSet(A, f(c1, c2))
			}
		} else {
			this.closure.registerSet(A, new LuaNumber(c1.data+c2.data))
			if (this.verbose) {
				this.log(opcode, A, B, C, `  R(${A}) = ${c1.data} + ${c2.data} = ${c1.data+c2.data}`)
			}
		}		
    }
    instructionSelf(opcode: number, A: number, B: number, C: number) : void {
		// self a b c 
		const t = this.closure.registerGet(B)
		if (t.type !== EnumLuaValue.LuaTable) {
			throw new Error(`Expected a table representing an object, got ${EnumLuaValue[t.type]}`)
		}
		this.closure.registerSet(A+1, t)
		const c1 = this.rk(C)
		const f = (t.data as VMTable).get(c1)
		if (f.type !== EnumLuaValue.LuaFunction) {
			throw new Error(`Expected a method, got ${EnumLuaValue[f.type]}`)
		}
		this.closure.registerSet(A, f)
		
		if(this.verbose) {
			const v = c1.type===EnumLuaValue.LuaString ? Buffer.from(c1.data as Uint8Array).toString() : c1.data
			this.log(opcode, A, B, C, `  table : R(${A+1}) = R(${B});  R(${A}) = table[${v}]`)
		}
    }
    instructionNewTable(opcode: number, A: number, B: number, C: number) : void {
		// Create table in R(A) 
		const fB = floatingPointByte(B)
		const fC = floatingPointByte(C)
		const table = new LuaTable(new VMTable(B, C))
		this.closure.registerSet(A, table)
		if (this.verbose) {
			this.log(opcode, A, B, C, `  R(${A}) = new table(${fB}, ${fC})`)
		}
    }
    instructionSetTable(opcode: number, A: number, B: number, C: number) : void {
		// B and C are register index or constant index (9bit numbers)
		// if 9th bit is 1 it's constant index, otherwise register index
		// Get table from register A, and set table[B] to value of C
		const twrap = this.closure.registerGet(A)
		if (twrap.type !== EnumLuaValue.LuaTable) {
			throw new Error(`Expected table, got ${EnumLuaValue[twrap.type]} ${JSON.stringify(twrap)}`)
		}
		const table = twrap.data
		const key = this.rk(B)
		const value = this.rk(C)

		table.set(key, value)

		if (this.verbose) {
			const v = key.type===EnumLuaValue.LuaString ? Buffer.from(key.data as Uint8Array).toString() : key.data
			this.log(opcode, A, B, C, `  R(${A}): table[${v}] = ${EnumLuaValue[value.type] + ' ' + String(value.data).slice(0,20)}`)
		}
    }
    instructionSetUpval(opcode: number, A: number, B: number) : void {
		// Copy from register A into upvalue B
		const v = this.closure.registerGet(A)
		if (v.type === EnumLuaValue.LuaUpValue) {
			throw new Error('dont think i want to assign upvalue as data inside upvalue')
		}
		this.closure.upvalueSet(B, v)

		if (this.verbose) {
			this.log(opcode, A, B, `  Upvalue[${B}] = R(${A})`)
		}
    }
    instructionSetGlobal(opcode: number, A: number, Bx: number) : void {
		// Copy value from register A into global[name]
		// where name is given in constant number Bx     
		const name = this.closure.constantGet(Bx)
		if (name.type !== EnumLuaValue.LuaString) {
			throw new Error(`Unexpected LuaConstant Type, expected string, got ${name.type}`)
		}
		const v = this.closure.registerGet(A)

		this.globalSet(name as LuaString, v)
		if (this.verbose) {
			this.log(opcode, A, Bx, `  global[${Buffer.from(name.data).toString()}] = ${EnumLuaValue[v.type] + ' ' + String(v)}`)
		}
    }
    instructionGetTable(opcode: number, A: number, B: number, C: number) : void {
		// get table from register B and assign register a with table[rk(C)]
		const key = this.rk(C)
		const twrap = this.closure.registerGet(B)
		if (twrap.type !== EnumLuaValue.LuaTable) {
			throw new Error(`Expected table, got ${EnumLuaValue[twrap.type]} ${JSON.stringify(twrap)}`)
		}
		const value = twrap.data.get(key)
		this.closure.registerSet(A, value)
		if (this.verbose) {
			this.log(opcode, A, B, C, `  R(${A}) = R(${B}) [${key.data}]`)
		}
    }
    instructionGetGlobal(opcode: number, A: number, Bx: number) : void {
		// Copy the value of globals[name] into register A
		// where name is given in constant number Bx
		const namewrap = this.closure.constantGet(Bx)
		if (namewrap.type !== EnumLuaValue.LuaString) {
			throw new Error(`Expected string, got ${EnumLuaValue[namewrap.type]} ${JSON.stringify(namewrap)}`)
		}
		const v = this.globalGet(namewrap as LuaString)
		this.closure.registerSet(A, v)
		if (this.verbose) {
			this.log(opcode, A, Bx, `  R(${A}) = global[${Buffer.from(namewrap.data).toString()}]`)
		}
    }
    instructionGetUpval(opcode: number, A: number, B: number) : void {
		// Copy upvalue B to register A
		const v = this.closure.upvalueGet(B)
		this.closure.registerSet(A, v)

		if (this.verbose) {
			this.log(opcode, A, B, `  R(${A}) = upval[${B}]`)
		}
    }
    instructionLoadNil(opcode: number, A: number, B: number) : void {
		// Assign null to registers A through B 
		for(let i = A; i <= B; i++){
			this.closure.registerSet(i, new LuaNil())
		}
		
		if (this.verbose) {
			this.log(opcode, A, B, `  R(${A}..${B}) = LuaNil`)
		}
    }
    instructionLoadBool(opcode: number, A: number, B: number, C: number) : void {
		// B=0 false, otherwise true, if C is non 0 skip next instruction
		this.closure.registerSet(A, new LuaBool(B!==0))
		if (C) {
			this.closure.jmp(1)
		}

		if (this.verbose) {
			this.log(opcode, A, B, C, `  R(${A}) = ${B!==0}; if ${C}: pc++`)
		} 
    }
    instructionLoadK(opcode: number, A: number, Bx: number) : void {
		// Load constant Bx into register A
		const v = this.closure.constantGet(Bx)
		this.closure.registerSet(A, v)
		if (this.verbose) {
			const vdisplay = v.type === EnumLuaValue.LuaString ? `'${Buffer.from(v.data).toString()}'` : v.data
			this.log(opcode, A, Bx, `  R(${A}) = constant[${Bx}] = ${vdisplay} `)
		} 
    }
    instructionMove(opcode: number, A: number, B: number) : void {
		// Copy register B into register A
		const v = this.closure.registerGet(B)
		this.closure.registerSet(A, v)
		if (this.verbose) {
			this.log(opcode, A, B, `  R(${A}) = R(${B})`)
		}
    }

    rk(value: number) : LuaValue<any> {
		const isConstant = (value & RKMSB) === RKMSB
		const n = value & 0xff
		// const constant: LuaValueType = this.closure.constantGet(n)

		// return {
		//     isConstant: isConstant,
		//     constant: constant,
		//     number: n
		// }
		const res = isConstant ? this.closure.constantGet(n) : this.closure.registerGet(n)
		return res
    }

    log(opcode: number, ...args: any[]) : void {
		const str = `[${this.closure.pc-1}]`.padStart(6,' ') + `[${opcode}]`.padStart(6,' ') + ` ${iSTR[opcode]}:`.padEnd(18,' ') + `${args.slice(0,-1).map(v=>String(v).padStart(5,' ')).join('  ').padEnd(21, ' ')}` + args.reverse()[0]
		this.backlog.push(str)
    }
}


function floatingPointByte(byte: number) : number {
	// “floating point byte” (so named in lobject.c) 
	// which is eeeeexxx in binary, where x is the mantissa and e
	// is the exponent. The actual value is calculated as 
	//     1xxx*2^(eeeee-1)    if eeeee is greater than 0 (a range of 8 to 15*2^30.)
	//     xxx                 if eeeee is 0, the actual
	// 15 * 2^30  > int.max, so not sure if the following works
	// need to see it's intended use
	const mantissabase = byte & 0b111
	const exponentbase = (byte >>> 3) & 0b11111
	if (exponentbase === 0) {
		return mantissabase
	} else {
		const mantissa = mantissabase + 0b1000
		const exponent = exponentbase - 1
		return mantissa*(1<<exponent)
	}
}
