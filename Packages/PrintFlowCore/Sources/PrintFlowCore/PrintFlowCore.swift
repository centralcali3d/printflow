// PrintFlowCore — cost engine scaffold.
//
// Stage 1 fills this in (tasks 1.4-1.7). The types below fix the shape the
// golden-file parity tests will assert against, so the package builds and CI
// is green from Stage 0 onward.
//
// DESIGN RULES, carried from MODERNIZATION_PLAN.md §4:
//   1. Pure. No I/O, no clock, no locale. Same inputs -> same cents, forever.
//   2. Every extension defaults to reproducing v1.11.0 exactly.
//   3. Money is Decimal, never Double. Binary floating point cannot represent
//      $0.10, and this engine decides what the business thinks it earned.

import Foundation

/// Cost rates in force for a given period. Mirrors one `cost_model_versions`
/// row. Defaults reproduce v1.11.0 with every extension disabled.
public struct CostModel: Sendable, Equatable {
    public enum ElectricityMode: String, Sendable, Equatable {
        /// Flat dollars per print hour — what v1.11.0 does.
        case flat
        /// Printer wattage × kWh rate — more accurate, opt-in.
        case metered
    }

    public var electricityMode: ElectricityMode
    public var electricityRatePerHour: Decimal
    public var kWhRate: Decimal
    public var laborRatePerHour: Decimal
    public var machineRatePerHour: Decimal
    public var overheadPerUnit: Decimal
    public var defaultWastePercent: Decimal
    public var mileageRate: Decimal
    public var postOfficeMiles: Decimal

    /// v1.11.0's rates, with machine rate, overhead, waste, and metered
    /// electricity all off. A fresh workspace prices identically to today.
    public static let v1_11_0 = CostModel(
        electricityMode: .flat,
        electricityRatePerHour: Decimal(string: "0.17")!,
        kWhRate: 0,
        laborRatePerHour: Decimal(string: "25.00")!,
        machineRatePerHour: 0,
        overheadPerUnit: 0,
        defaultWastePercent: 0,
        mileageRate: Decimal(string: "0.70")!,
        postOfficeMiles: Decimal(string: "3.6")!
    )

    public init(
        electricityMode: ElectricityMode,
        electricityRatePerHour: Decimal,
        kWhRate: Decimal,
        laborRatePerHour: Decimal,
        machineRatePerHour: Decimal,
        overheadPerUnit: Decimal,
        defaultWastePercent: Decimal,
        mileageRate: Decimal,
        postOfficeMiles: Decimal
    ) {
        self.electricityMode = electricityMode
        self.electricityRatePerHour = electricityRatePerHour
        self.kWhRate = kWhRate
        self.laborRatePerHour = laborRatePerHour
        self.machineRatePerHour = machineRatePerHour
        self.overheadPerUnit = overheadPerUnit
        self.defaultWastePercent = defaultWastePercent
        self.mileageRate = mileageRate
        self.postOfficeMiles = postOfficeMiles
    }
}

/// A product's cost broken into the parts the UI shows separately.
public struct CostBreakdown: Sendable, Equatable {
    public var filament: Decimal
    public var electricity: Decimal
    public var labor: Decimal
    public var machine: Decimal
    public var packaging: Decimal
    public var overhead: Decimal

    public var total: Decimal {
        filament + electricity + labor + machine + packaging + overhead
    }

    public init(
        filament: Decimal = 0,
        electricity: Decimal = 0,
        labor: Decimal = 0,
        machine: Decimal = 0,
        packaging: Decimal = 0,
        overhead: Decimal = 0
    ) {
        self.filament = filament
        self.electricity = electricity
        self.labor = labor
        self.machine = machine
        self.packaging = packaging
        self.overhead = overhead
    }
}

/// What gets frozen onto a sale row at save time and never recomputed.
/// Reports read these columns; nothing re-derives them.
public struct SaleSnapshot: Sendable, Equatable {
    public var unitCost: Decimal
    public var totalCost: Decimal
    public var profit: Decimal
    public var marginPercent: Decimal

    public init(unitCost: Decimal, totalCost: Decimal, profit: Decimal, marginPercent: Decimal) {
        self.unitCost = unitCost
        self.totalCost = totalCost
        self.profit = profit
        self.marginPercent = marginPercent
    }
}

public enum PrintFlowCore {
    /// Set once the golden-file parity tests in Stage 1 pass (task 1.5).
    public static let parityVerified = false
}
