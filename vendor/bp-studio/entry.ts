// Adapter compiled INTO the BP Studio core bundle (see build.sh). It drives the
// same core calls BP Studio's own test helper uses (test/utils/tree.ts,
// createTree) and exports the layout as crease-pattern lines.
import { Tree } from "core/design/context/tree";
import { heightTask } from "core/design/tasks/height";
import { Processor } from "core/service/processor";
import { State, fullReset } from "core/service/state";
import { LayoutController } from "core/controller/layoutController";

import type { JEdge, JFlap } from "shared/json";

export interface BlueprintInput {
	edges: { n1: number; n2: number; length: number }[];
	flaps: { id: number; x: number; y: number; width: number; height: number }[];
	width: number;
	height: number;
}

export interface BlueprintOutput {
	/** ORIPA line types: 1 border, 2 mountain (ridges), 3 valley (hinges / axial-parallels). */
	lines: { type: number; p1: { x: number; y: number }; p2: { x: number; y: number } }[];
	junctions: number;
	invalidJunctions: number;
	stretches: number;
	stretchesWithPattern: number;
}

export function blueprint(input: BlueprintInput): BlueprintOutput {
	fullReset();
	const tree = new Tree(input.edges as unknown as JEdge[], input.flaps as unknown as JFlap[]);
	State.m.$tree = tree;
	Processor.$run(heightTask);
	const { width: w, height: h } = input;
	const lines = LayoutController.getCP([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], false);
	const junctions = [...State.$junctions.values()];
	const stretches = [...State.$stretches.values()];
	return {
		lines: lines.map((l) => ({ type: l.type, p1: { x: l.p1.x, y: l.p1.y }, p2: { x: l.p2.x, y: l.p2.y } })),
		junctions: junctions.length,
		invalidJunctions: junctions.filter((j) => !j.$valid).length,
		stretches: stretches.length,
		stretchesWithPattern: stretches.filter((s) => s.$repo.$pattern).length,
	};
}
