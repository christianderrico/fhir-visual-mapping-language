// const createChildNode = (alias: string, father: FMLNode, field?: string) => ({
//   alias,
//   field,
//   father,
//   children: [],
// });

// const processChildNodes = (
//   children: Set<FMLBaseEntity>,
//   fatherAlias: string,
//   new_node: any,
//   nodeType: string,
// ) => {
//   const childrenArray = Array.from(children.values());

//   childrenArray.forEach((child) => {
//     if (isRule(child)) {
//       processRuleChild(child, fatherAlias, new_node, nodeType);
//     } else if (isGroupNode(child)) {
//       processGroupNodeChild(child, fatherAlias, new_node, nodeType);
//     }
//   });
// };

// const processRuleChild = (
//   child: FMLRule,
//   fatherAlias: string,
//   new_node: any,
//   node_type: string,
// ) => {
//   if (node_type === "sourceNode")
//     child.rightParams
//       .filter(
//         (p: Parameter): p is TransformParameter =>
//           isTransformParam(p) && p.alias === fatherAlias,
//       )
//       .forEach((transformParam: TransformParameter) => {
//         new_node.children.push(
//           createChildNode(transformParam.alias, new_node, transformParam.field),
//         );
//       });
//   else {
//     if (child.leftParam.alias === fatherAlias) {
//       new_node.children.push(
//         createChildNode(child.leftParam.alias, new_node, child.leftParam.field),
//       );
//     }
//   }
// };

// const processGroupNodeChild = (
//   child: any,
//   fatherAlias: string,
//   new_node: any,
//   nodeType: string,
// ) => {
//   const references = nodeType === "sourceNode" ? child.sources : child.targets;

//   references
//     .filter((ref: TransformParameter) => ref.alias === fatherAlias)
//     .forEach((ref: TransformParameter) => {
//       new_node.children.push(createChildNode(ref.alias, new_node, ref.field));
//     });
// };