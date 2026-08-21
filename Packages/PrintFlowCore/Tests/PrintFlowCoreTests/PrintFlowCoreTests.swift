import Testing
import Foundation
@testable import PrintFlowCore

// Stage 1 replaces these with golden-file parity tests generated from the
// live sheet (tasks 1.3-1.5). These only pin the invariants that must hold
// before any formula exists, so a regression in the defaults is caught early.

@Test("v1.11.0 defaults disable every cost extension")
func defaultsReproduceV1_11_0() {
    let m = CostModel.v1_11_0
    #expect(m.electricityMode == .flat)
    #expect(m.electricityRatePerHour == Decimal(string: "0.17")!)
    #expect(m.laborRatePerHour == Decimal(string: "25.00")!)
    // The extensions must be inert, or a fresh workspace would not price
    // identically to the current app.
    #expect(m.machineRatePerHour == 0)
    #expect(m.overheadPerUnit == 0)
    #expect(m.defaultWastePercent == 0)
    #expect(m.kWhRate == 0)
}

@Test("cost breakdown totals its parts")
func breakdownTotals() {
    let b = CostBreakdown(
        filament: Decimal(string: "3.25")!,
        electricity: Decimal(string: "1.45")!,
        labor: Decimal(string: "7.50")!,
        packaging: Decimal(string: "1.75")!
    )
    #expect(b.total == Decimal(string: "13.95")!)
}

@Test("an empty breakdown is exactly zero, not near it")
func emptyBreakdownIsZero() {
    #expect(CostBreakdown().total == Decimal(0))
}

@Test("parity is not claimed until Stage 1 proves it")
func parityNotYetClaimed() {
    // Flipped to true only when task 1.5 passes against the golden files.
    #expect(PrintFlowCore.parityVerified == false)
}
