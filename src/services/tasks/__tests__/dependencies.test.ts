import { wouldCreateDependencyCycle } from "@/services/tasks/dependencies";

describe("task dependency cycle detection", () => {
  const edges = [
    { blockerTaskId: "a", blockedTaskId: "b" },
    { blockerTaskId: "b", blockedTaskId: "c" },
  ];

  it("rejects self references and transitive cycles", () => {
    expect(wouldCreateDependencyCycle(edges, "a", "a")).toBe(true);
    expect(wouldCreateDependencyCycle(edges, "c", "a")).toBe(true);
  });

  it("allows a new acyclic branch", () => {
    expect(wouldCreateDependencyCycle(edges, "a", "d")).toBe(false);
    expect(wouldCreateDependencyCycle(edges, "d", "c")).toBe(false);
  });
});
