import { describe, expect, it } from "vitest";
import { aggregateReportRows } from "./db";

describe("aggregateReportRows", () => {
  it("calcula frequência, presença e faltas por culto", () => {
    const result = aggregateReportRows([
      { eventDate: "2026-08-03", eventType: "Culto Sedentos", youthId: 1, youthName: "Ana", discipulatorId: 10, discipulatorName: "João", status: "present", followUpStatus: null },
      { eventDate: "2026-08-03", eventType: "Culto Sedentos", youthId: 2, youthName: "Bia", discipulatorId: 10, discipulatorName: "João", status: "absent", followUpStatus: "contacted" },
      { eventDate: "2026-08-10", eventType: "Culto Sedentos", youthId: 1, youthName: "Ana", discipulatorId: 10, discipulatorName: "João", status: "present", followUpStatus: null },
    ]);
    expect(result.present).toBe(2);
    expect(result.absent).toBe(1);
    expect(result.frequency).toBe(66.7);
    expect(result.events).toEqual([
      { eventDate: "2026-08-03", eventType: "Culto Sedentos", present: 1, absent: 1 },
      { eventDate: "2026-08-10", eventType: "Culto Sedentos", present: 1, absent: 0 },
    ]);
    expect(result.ranking.find(row => row.youthId === 2)).toMatchObject({ present: 0, absent: 1, frequency: 0, followUpStatus: "contacted" });
  });

  it("não inventa frequência quando não há registros", () => {
    const result = aggregateReportRows([]);
    expect(result.frequency).toBeNull();
    expect(result.present).toBe(0);
    expect(result.absent).toBe(0);
    expect(result.events).toHaveLength(0);
  });
});
