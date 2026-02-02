//import type {Tree} from '@lezer/common'
 
// interface Transform<A, B> {
//   transform(a: A): B
// }

// type Const = string | number;
// type Path = string[]

// type Arg = Const | Path;
// type TransformCommand = 
//   | { type: "copy", paths: Const | Path }
//   | { type: "transform", transformName: string, args: Arg[] }

// function aaaaaa(tree: Tree): TransformCommand {
//   const cursor = tree.cursor();

//   if (cursor.name !== "Program") throw new Error(`Expected top-level "Program" node, got ${cursor.name}.`);
//   //TODO
//   return {type: 'transform', transformName: 'toDoTransform', args: []}

// }
