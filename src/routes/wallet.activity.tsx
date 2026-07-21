import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, CalendarIcon, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/wallet/activity")({
  component: ActivityPage,
});

type TxType = "received" | "sent";
type TxStatus = "confirmed" | "pending" | "failed";

interface MockTx {
  id: string;
  type: TxType;
  status: TxStatus;
  amount: string; // ZOKA
  fee?: string;
  height: number;
  timestamp: number; // ms
  counterparty: string;
  memo?: string;
}

/**
 * ⚠️ SIMULATED DATA — for UI development only.
 * The real activity list comes from ZokaWalletEngine.scanWallet() using the
 * private scan key locally. This dataset never leaves the device and is not
 * connected to any node.
 */
const now = Date.now();
const day = 86_400_000;
const MOCK_TRANSACTIONS: MockTx[] = [
  {
    id: "9f2c" + "a".repeat(56) + "1b",
    type: "received",
    status: "confirmed",
    amount: "12.500000",
    height: 1_284_912,
    timestamp: now - 2 * 3600_000,
    counterparty: "zoka1mock" + "b".repeat(28),
    memo: "Payment invoice #A-102",
  },
  {
    id: "a71e" + "b".repeat(56) + "2c",
    type: "sent",
    status: "confirmed",
    amount: "3.200000",
    fee: "0.001000",
    height: 1_284_701,
    timestamp: now - 1 * day,
    counterparty: "zoka1mock" + "c".repeat(28),
  },
  {
    id: "5c9d" + "c".repeat(56) + "3d",
    type: "sent",
    status: "pending",
    amount: "0.750000",
    fee: "0.001000",
    height: 0,
    timestamp: now - 20 * 60_000,
    counterparty: "zoka1mock" + "d".repeat(28),
    memo: "Coffee",
  },
  {
    id: "e310" + "d".repeat(56) + "4e",
    type: "received",
    status: "confirmed",
    amount: "50.000000",
    height: 1_280_004,
    timestamp: now - 4 * day,
    counterparty: "zoka1mock" + "e".repeat(28),
    memo: "Salary",
  },
  {
    id: "7b21" + "e".repeat(56) + "5f",
    type: "sent",
    status: "failed",
    amount: "1.000000",
    fee: "0.001000",
    height: 0,
    timestamp: now - 7 * day,
    counterparty: "zoka1mock" + "f".repeat(28),
  },
  {
    id: "22cd" + "f".repeat(56) + "6a",
    type: "received",
    status: "confirmed",
    amount: "8.125000",
    height: 1_270_133,
    timestamp: now - 14 * day,
    counterparty: "zoka1mock" + "a".repeat(28),
  },
  {
    id: "b6f0" + "a".repeat(56) + "7b",
    type: "sent",
    status: "confirmed",
    amount: "15.000000",
    fee: "0.002000",
    height: 1_260_800,
    timestamp: now - 30 * day,
    counterparty: "zoka1mock" + "b".repeat(28),
    memo: "Rent",
  },
];

type TypeFilter = "all" | TxType;

function shorten(s: string, head = 8, tail = 6) {
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function statusVariant(s: TxStatus) {
  if (s === "confirmed") return "bg-success/15 text-success border-success/30";
  if (s === "pending") return "bg-warning/15 text-warning border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

const FILTERS_STORAGE_KEY = "zoka.wallet.activity.filters.v0";

interface StoredFilters {
  typeFilter: TypeFilter;
  fromDate?: string; // ISO
  toDate?: string; // ISO
}

function loadFilters(): StoredFilters {
  if (typeof window === "undefined") return { typeFilter: "all" };
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return { typeFilter: "all" };
    const parsed = JSON.parse(raw) as Partial<StoredFilters>;
    const type: TypeFilter =
      parsed.typeFilter === "received" || parsed.typeFilter === "sent" ? parsed.typeFilter : "all";
    return {
      typeFilter: type,
      fromDate: typeof parsed.fromDate === "string" ? parsed.fromDate : undefined,
      toDate: typeof parsed.toDate === "string" ? parsed.toDate : undefined,
    };
  } catch {
    return { typeFilter: "all" };
  }
}

function ActivityPage() {
  const initial = useMemo(() => loadFilters(), []);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initial.typeFilter);
  const [fromDate, setFromDate] = useState<Date | undefined>(
    initial.fromDate ? new Date(initial.fromDate) : undefined,
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    initial.toDate ? new Date(initial.toDate) : undefined,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDefault = typeFilter === "all" && !fromDate && !toDate;
    if (isDefault) {
      window.localStorage.removeItem(FILTERS_STORAGE_KEY);
      return;
    }
    const payload: StoredFilters = {
      typeFilter,
      fromDate: fromDate?.toISOString(),
      toDate: toDate?.toISOString(),
    };
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(payload));
  }, [typeFilter, fromDate, toDate]);

  const filtered = useMemo(() => {
    return MOCK_TRANSACTIONS.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (fromDate && tx.timestamp < fromDate.getTime()) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (tx.timestamp > end.getTime()) return false;
      }
      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [typeFilter, fromDate, toDate]);

  const hasFilters = typeFilter !== "all" || fromDate || toDate;

  const totals = useMemo(() => {
    let received = 0;
    let sent = 0;
    for (const tx of filtered) {
      const amt = Number(tx.amount);
      if (tx.type === "received" && tx.status === "confirmed") received += amt;
      if (tx.type === "sent" && tx.status !== "failed") sent += amt;
    }
    return { received, sent };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Detected locally · Never uploaded
        </p>
      </header>

      {/* Filters */}
      <section className="zk-panel p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2 text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span className="mono text-[10px] uppercase tracking-widest">Filters</span>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Type
            </label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All transactions</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              From
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal md:w-[200px]",
                    !fromDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "PPP") : <span>Any</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={setFromDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              To
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal md:w-[200px]",
                    !toDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "PPP") : <span>Any</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={setToDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTypeFilter("all");
                setFromDate(undefined);
                setToDate(undefined);
              }}
              className="mono text-[11px] uppercase tracking-wider"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        <div className="mono mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-[11px] md:grid-cols-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Matches
            </div>
            <div className="mt-0.5 text-foreground">{filtered.length}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Received
            </div>
            <div className="mt-0.5 text-success">+{totals.received.toFixed(6)} ZOKA</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Sent
            </div>
            <div className="mt-0.5 text-foreground">−{totals.sent.toFixed(6)} ZOKA</div>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="zk-panel divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="mono py-16 text-center text-xs text-muted-foreground">
            No transactions match these filters.
          </div>
        ) : (
          filtered.map((tx) => {
            const isReceived = tx.type === "received";
            return (
              <div
                key={tx.id}
                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                      isReceived
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-border bg-accent text-foreground",
                    )}
                  >
                    {isReceived ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {isReceived ? "Received" : "Sent"}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mono text-[9px] uppercase tracking-widest",
                          statusVariant(tx.status),
                        )}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                    <div className="mono mt-0.5 text-[11px] text-muted-foreground">
                      {isReceived ? "from " : "to "}
                      {shorten(tx.counterparty)}
                    </div>
                    {tx.memo && (
                      <div className="mt-1 text-xs text-muted-foreground">“{tx.memo}”</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1 md:items-end">
                  <div
                    className={cn(
                      "mono text-sm",
                      isReceived ? "text-success" : "text-foreground",
                    )}
                  >
                    {isReceived ? "+" : "−"}
                    {tx.amount} ZOKA
                  </div>
                  <div className="mono flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>{format(tx.timestamp, "PP p")}</span>
                    {tx.height > 0 && <span>· #{tx.height.toLocaleString()}</span>}
                    {tx.fee && <span>· fee {tx.fee}</span>}
                  </div>
                  <div className="mono text-[10px] text-muted-foreground">
                    tx {shorten(tx.id, 10, 8)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Simulated data · Real history requires scanning against a Zoka node using the private scan
        key — locally, never uploaded.
      </p>
    </div>
  );
}
