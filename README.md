This is a lua bytecode interpreter written for NodeJS. It loads a compiled lua file and attempts to run it top to bottom. The project was abandoned before completion. If you want to try it out, download one of the tests from lua.org, compile it and run it using the test.ts or index.ts file.
(Abandoned end of year 2020)

## Story
Why? Why wouldn't you want to execute lua bytecode from within NodeJS? I was looking for a coding project and thought it might be fun to program an interpreter. I played a game that was using lua files to display information on screen that I also was interested in. I combined the two until the work bogged me down and I decided to move on. 

This program was implemented by incrementally parsing and running .luac files from the game. Testing wasn't a big part of the routine. Therefore there are many unknown bugs and from what I recall I had a wrong mental model of how UpValues worked when implementing them. Using .luac files from a game was the wrong choice here and made finding errors troublesome.

If I were to start over, I'd use the official lua test files instead.

## Structure
lua-vm.ts  keeps track of machine state and executes the instructions.
luac-parse.ts  is responsible for reading instructions and data in a .luac file.
lualib-\*.ts  files implement parts of the standard library and can be used to implement external function calls.
index.ts & test.ts were used to load luac programs, initialize the vm with the correct libraries and start the vm.
Remaining lua-\*.ts files are implementations for lua language datastructures.

## Resources
[http://luaforge.net/docman/83/98/ANoFrillsIntroToLua51VMInstructions.pdf](http://luaforge.net/docman/83/98/ANoFrillsIntroToLua51VMInstructions.pdf)
[https://www.lua.org/manual/5.1/manual.html](https://www.lua.org/manual/5.1/manual.html)
[https://www.lua.org/source/5.1/](https://www.lua.org/source/5.1/)
[https://www.lua.org/source/5.1/idx.html](https://www.lua.org/source/5.1/idx.html)
[https://www.lua.org/pil/28.html](https://www.lua.org/pil/28.html) user defined types
[https://www.lua.org/doc/jucs05.pdf](https://www.lua.org/doc/jucs05.pdf)
[http://luaforge.net/projects/chunkspy/](http://luaforge.net/projects/chunkspy/)
[https://www.lua.org/tests/](https://www.lua.org/tests/)
and others.

## License
As parts of this code (src/lualib-\*.ts) are derived from work by LUA I include their license in LUA-LICENSE file. Go check out their work at [LUA.org](https://www.lua.org/).
The remainder of this code (lua-\*.ts) was written by me and is also released under the MIT license, found in LICENSE file.