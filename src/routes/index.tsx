import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BatteryFull,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Coffee,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  Home,
  Landmark,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Signal,
  SlidersHorizontal,
  Smartphone,
  UserRound,
  Wallet,
  Wifi,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Neobank — Keuangan pribadi dalam satu genggaman" },
      {
        name: "description",
        content: "Pantau saldo, kartu, transaksi, dan aktivitas keuangan harian Anda.",
      },
      { property: "og:title", content: "Neobank — Keuangan pribadi dalam satu genggaman" },
      {
        property: "og:description",
        content: "Pantau saldo, kartu, transaksi, dan aktivitas keuangan harian Anda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type TabKey = "home" | "map" | "transfer" | "settings" | "profile";
type Screen = TabKey | "transactions" | "add-money";
type Transaction = {
  merchant: string;
  detail: string;
  amount: number;
  kind: "expense" | "income";
  icon: LucideIcon;
};

const navigation: { id: TabKey; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Beranda", icon: Home },
  { id: "map", label: "Peta", icon: MapPin },
  { id: "transfer", label: "Transfer", icon: ArrowLeftRight },
  { id: "settings", label: "Pengaturan", icon: Settings },
  { id: "profile", label: "Profil", icon: UserRound },
];

const transactions: Transaction[] = [
  {
    merchant: "Kopi Kenangan",
    detail: "Hari ini, 09.00",
    amount: 28500,
    kind: "expense",
    icon: Coffee,
  },
  {
    merchant: "Super Indo",
    detail: "Hari ini, 08.12",
    amount: 186400,
    kind: "expense",
    icon: ShoppingBag,
  },
  {
    merchant: "Cashback belanja",
    detail: "Kemarin, 18.42",
    amount: 12500,
    kind: "income",
    icon: Gift,
  },
  {
    merchant: "Grab",
    detail: "Kemarin, 17.30",
    amount: 42000,
    kind: "expense",
    icon: ArrowDownLeft,
  },
];

const contacts = [
  { name: "Rina Putri", bank: "BCA ···· 2841", initials: "RP" },
  { name: "Andi Pratama", bank: "BRI ···· 5510", initials: "AP" },
  { name: "Sari Wulandari", bank: "Mandiri ···· 9027", initials: "SW" },
];

const moneyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function Index() {
  const [screen, setScreen] = useState<Screen>("home");
  const [balance, setBalance] = useState(32_000_000);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [addStep, setAddStep] = useState<"source" | "amount" | "success">("source");
  const [selectedSource, setSelectedSource] = useState("");
  const [amount, setAmount] = useState("");
  const [cardTransactionsAllowed, setCardTransactionsAllowed] = useState(true);
  const [onlinePayments, setOnlinePayments] = useState(true);
  const [selectedContact, setSelectedContact] = useState("");
  const [transferNotice, setTransferNotice] = useState(false);
  const [merchant, setMerchant] = useState("Pasar Raya Senja");
  const [transactionFilter, setTransactionFilter] = useState<"Semua" | "Keluar" | "Masuk">(
    "Semua",
  );

  function openAddMoney() {
    setAddStep("source");
    setSelectedSource("");
    setAmount("");
    setScreen("add-money");
  }

  function finishAddMoney() {
    const parsedAmount = Number(amount.replaceAll(".", ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setBalance((currentBalance) => currentBalance + parsedAmount);
    setAddStep("success");
  }

  const visibleTransactions = transactions.filter((transaction) => {
    if (transactionFilter === "Keluar") return transaction.kind === "expense";
    if (transactionFilter === "Masuk") return transaction.kind === "income";
    return true;
  });

  return (
    <div className="app-stage">
      <main className="app-frame">
        {screen === "add-money" ? (
          <AddMoneyScreen
            amount={amount}
            balance={balance}
            onAmountChange={setAmount}
            onBack={() => setScreen("home")}
            onContinue={() => setAddStep("amount")}
            onFinish={finishAddMoney}
            onSelectSource={setSelectedSource}
            selectedSource={selectedSource}
            step={addStep}
          />
        ) : (
          <>
            <section className="app-page" aria-live="polite">
              {screen === "home" && (
                <HomeScreen
                  balance={balance}
                  balanceVisible={balanceVisible}
                  onAddMoney={openAddMoney}
                  onBalanceToggle={() => setBalanceVisible((visible) => !visible)}
                  onOpenTransactions={() => setScreen("transactions")}
                />
              )}
              {screen === "transactions" && (
                <TransactionsScreen
                  filter={transactionFilter}
                  onBack={() => setScreen("home")}
                  onFilterChange={setTransactionFilter}
                  rows={visibleTransactions}
                />
              )}
              {screen === "map" && <MapScreen merchant={merchant} onSelect={setMerchant} />}
              {screen === "transfer" && (
                <TransferScreen
                  contact={selectedContact}
                  notice={transferNotice}
                  onContinue={() => setTransferNotice(true)}
                  onSelect={(name) => {
                    setSelectedContact(name);
                    setTransferNotice(false);
                  }}
                />
              )}
              {screen === "settings" && (
                <SettingsScreen
                  onlinePayments={onlinePayments}
                  onOnlinePaymentsChange={setOnlinePayments}
                  onCardTransactionsChange={setCardTransactionsAllowed}
                  cardTransactionsAllowed={cardTransactionsAllowed}
                />
              )}
              {screen === "profile" && <ProfileScreen />}
            </section>
            <BottomNavigation active={screen === "transactions" ? "home" : screen} onChange={setScreen} />
          </>
        )}
      </main>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="status-bar" aria-label="Status perangkat">
      <span>9:41</span>
      <div className="status-icons" aria-hidden="true">
        <Signal />
        <Wifi />
        <BatteryFull />
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      aria-label={label}
      className="icon-button"
      onClick={onClick}
      size="icon"
      title={label}
      type="button"
      variant="outline"
    >
      {children}
    </Button>
  );
}

function HomeScreen({
  balance,
  balanceVisible,
  onAddMoney,
  onBalanceToggle,
  onOpenTransactions,
}: {
  balance: number;
  balanceVisible: boolean;
  onAddMoney: () => void;
  onBalanceToggle: () => void;
  onOpenTransactions: () => void;
}) {
  return (
    <>
      <StatusBar />
      <header className="welcome-row">
        <div>
          <p className="eyebrow">Selamat pagi, Dimas</p>
          <p className="supporting-copy">Senang melihatmu kembali</p>
        </div>
        <IconButton label="Buka notifikasi">
          <Bell />
        </IconButton>
      </header>

      <section className="balance-panel" aria-labelledby="balance-title">
        <div className="balance-panel-heading">
          <p id="balance-title" className="balance-label">
            Total saldo
          </p>
          <IconButton label={balanceVisible ? "Sembunyikan saldo" : "Tampilkan saldo"} onClick={onBalanceToggle}>
            {balanceVisible ? <EyeOff /> : <Eye />}
          </IconButton>
        </div>
        <p className="balance-amount">{balanceVisible ? formatMoney(balance) : "••••••••"}</p>
        <Button className="balance-action" onClick={onAddMoney} type="button">
          <Plus /> Tambah saldo
        </Button>
      </section>

      <section className="content-section" aria-labelledby="cards-heading">
        <div className="section-heading">
          <h2 id="cards-heading">Kartu saya</h2>
          <span className="section-count">01</span>
        </div>
        <div className="bank-card" aria-label="Kartu debit berakhiran 4568">
          <div className="bank-card-top">
            <span className="bank-card-chip" aria-hidden="true" />
            <span className="bank-card-brand">NEO</span>
          </div>
          <p className="bank-card-caption">Kartu debit</p>
          <div className="bank-card-bottom">
            <span>•••• 4568</span>
            <span className="bank-card-cardholder">Dimas A.</span>
          </div>
        </div>
      </section>

      <section className="content-section transactions-preview" aria-labelledby="transactions-heading">
        <div className="section-heading">
          <h2 id="transactions-heading">Transaksi terbaru</h2>
          <Button className="text-action" onClick={onOpenTransactions} type="button" variant="ghost">
            Lihat semua <ChevronRight />
          </Button>
        </div>
        <div className="transaction-list">
          {transactions.slice(0, 3).map((transaction) => (
            <TransactionRow key={transaction.merchant} transaction={transaction} />
          ))}
        </div>
      </section>
    </>
  );
}

function AddMoneyScreen({
  amount,
  balance,
  onAmountChange,
  onBack,
  onContinue,
  onFinish,
  onSelectSource,
  selectedSource,
  step,
}: {
  amount: string;
  balance: number;
  onAmountChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onFinish: () => void;
  onSelectSource: (source: string) => void;
  selectedSource: string;
  step: "source" | "amount" | "success";
}) {
  const sources = [
    { name: "Transfer bank", description: "Dari rekening bank lain", icon: Landmark },
    { name: "Kartu debit", description: "Debit atau kartu kredit", icon: CreditCard },
    { name: "Virtual account", description: "Bayar melalui ATM atau mobile banking", icon: Smartphone },
    { name: "Antar rekening", description: "Pindahkan dana dari rekening lain", icon: ArrowLeftRight },
  ];

  return (
    <div className="add-money-page">
      <StatusBar />
      <header className="subpage-header">
        <IconButton label="Kembali" onClick={onBack}>
          <ArrowLeft />
        </IconButton>
        <h1>Tambah saldo</h1>
        <span className="header-spacer" />
      </header>

      {step === "source" && (
        <>
          <p className="page-intro">Pilih cara untuk mengisi rekening Neobank kamu.</p>
          <section className="source-section" aria-labelledby="source-title">
            <h2 id="source-title">Pilih sumber dana</h2>
            <div className="source-list">
              {sources.map((source) => {
                const SourceIcon = source.icon;
                return (
                  <Button
                    aria-pressed={selectedSource === source.name}
                    className={`source-option${selectedSource === source.name ? " source-option-selected" : ""}`}
                    key={source.name}
                    onClick={() => onSelectSource(source.name)}
                    type="button"
                    variant="outline"
                  >
                    <span className="source-icon"><SourceIcon /></span>
                    <span className="source-copy">
                      <span className="source-name">{source.name}</span>
                      <span className="source-description">{source.description}</span>
                    </span>
                    <ChevronRight className="source-chevron" />
                  </Button>
                );
              })}
            </div>
          </section>
          <div className="bottom-action">
            <Button className="full-action" disabled={!selectedSource} onClick={onContinue} type="button">
              Lanjutkan <ChevronRight />
            </Button>
          </div>
        </>
      )}

      {step === "amount" && (
        <>
          <p className="page-intro">Isi saldo melalui {selectedSource.toLowerCase()}.</p>
          <section className="amount-panel">
            <p className="balance-label">Saldo saat ini</p>
            <p className="amount-current">{formatMoney(balance)}</p>
            <label className="amount-label" htmlFor="top-up-amount">Nominal isi saldo</label>
            <div className="amount-input-wrap">
              <span>Rp</span>
              <Input
                autoComplete="off"
                className="money-input"
                id="top-up-amount"
                inputMode="numeric"
                onChange={(event) => onAmountChange(event.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                value={amount}
              />
            </div>
            <div className="quick-amounts" aria-label="Pilihan nominal">
              {[100000, 250000, 500000].map((value) => (
                <Button
                  className="amount-chip"
                  key={value}
                  onClick={() => onAmountChange(String(value))}
                  type="button"
                  variant="outline"
                >
                  {formatMoney(value).replace(",00", "")}
                </Button>
              ))}
            </div>
          </section>
          <div className="bottom-action">
            <Button className="full-action" disabled={!amount || Number(amount) <= 0} onClick={onFinish} type="button">
              Tambahkan dana
            </Button>
          </div>
        </>
      )}

      {step === "success" && (
        <section className="success-state" aria-live="polite">
          <span className="success-icon"><Check /></span>
          <p className="eyebrow">Berhasil</p>
          <h2>Saldo berhasil ditambahkan</h2>
          <p className="supporting-copy">{formatMoney(Number(amount))} sudah tercatat pada saldo demo kamu.</p>
          <p className="success-source">Sumber: {selectedSource}</p>
          <Button className="full-action" onClick={onBack} type="button">Kembali ke beranda</Button>
        </section>
      )}
    </div>
  );
}

function TransactionsScreen({
  filter,
  onBack,
  onFilterChange,
  rows,
}: {
  filter: "Semua" | "Keluar" | "Masuk";
  onBack: () => void;
  onFilterChange: (filter: "Semua" | "Keluar" | "Masuk") => void;
  rows: Transaction[];
}) {
  const filters = ["Semua", "Keluar", "Masuk"] as const;
  return (
    <>
      <StatusBar />
      <header className="page-header">
        <IconButton label="Kembali ke beranda" onClick={onBack}><ArrowLeft /></IconButton>
        <h1>Transaksi</h1>
        <IconButton label="Cari transaksi"><Search /></IconButton>
      </header>
      <div className="filter-row" role="group" aria-label="Saring transaksi">
        {filters.map((item) => (
          <Button
            aria-pressed={filter === item}
            className={`filter-chip${filter === item ? " filter-chip-active" : ""}`}
            key={item}
            onClick={() => onFilterChange(item)}
            type="button"
            variant="outline"
          >
            {item}
          </Button>
        ))}
        <Button aria-label="Pengaturan filter" className="filter-icon" type="button" variant="outline">
          <SlidersHorizontal />
        </Button>
      </div>
      <section className="transaction-day" aria-labelledby="today-total">
        <div className="day-summary">
          <div>
            <p className="supporting-copy">Hari ini, Jumat</p>
            <h2 id="today-total">Aktivitas terbaru</h2>
          </div>
          <p className="day-total">−Rp214.900</p>
        </div>
        <div className="transaction-list">
          {rows.map((transaction) => <TransactionRow key={transaction.merchant} transaction={transaction} />)}
        </div>
      </section>
      <section className="month-summary">
        <div className="section-heading">
          <h2>Ringkasan bulan ini</h2>
          <Receipt />
        </div>
        <div className="summary-pair">
          <span><ArrowUpRight /> Uang keluar</span>
          <strong>Rp2.450.000</strong>
        </div>
        <div className="summary-pair">
          <span><ArrowDownLeft /> Uang masuk</span>
          <strong>Rp8.125.000</strong>
        </div>
      </section>
    </>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const TransactionIcon = transaction.icon;
  const isIncome = transaction.kind === "income";
  return (
    <div className="transaction-row">
      <span className="transaction-icon"><TransactionIcon /></span>
      <span className="transaction-details">
        <span className="transaction-name">{transaction.merchant}</span>
        <span className="transaction-time">{transaction.detail}</span>
      </span>
      <span className="transaction-values">
        <span className="transaction-amount">{isIncome ? "+" : "−"}{formatMoney(transaction.amount)}</span>
        {isIncome && <span className="cashback-tag">Masuk</span>}
      </span>
    </div>
  );
}

function MapScreen({ merchant, onSelect }: { merchant: string; onSelect: (name: string) => void }) {
  const locations = [
    { name: "Pasar Raya Senja", icon: ShoppingBag, className: "map-pin map-pin-one" },
    { name: "Kopi Tepi Jalan", icon: Coffee, className: "map-pin map-pin-two" },
    { name: "Toko Sehat", icon: Gift, className: "map-pin map-pin-three" },
  ];
  return (
    <>
      <StatusBar />
      <header className="screen-title-row">
        <div>
          <p className="eyebrow">Jelajahi sekitar</p>
          <h1>Tempat favoritmu</h1>
        </div>
        <IconButton label="Cari tempat"><Search /></IconButton>
      </header>
      <div className="map-filter-row">
        <Button className="map-filter" type="button" variant="outline"><SlidersHorizontal /> Filter</Button>
        <Button className="map-filter map-filter-active" type="button" variant="outline"><Gift /> Cashback</Button>
      </div>
      <section className="map-canvas" aria-label="Peta toko di sekitar Anda">
        <span className="map-street-label map-street-label-one">Jl. Melati</span>
        <span className="map-street-label map-street-label-two">Jl. Cendana</span>
        <span className="map-street-label map-street-label-three">Jl. Merdeka</span>
        <span className="map-you"><span />Kamu di sini</span>
        {locations.map((location) => {
          const LocationIcon = location.icon;
          return (
            <Button
              aria-label={`Pilih ${location.name}`}
              className={`${location.className}${merchant === location.name ? " map-pin-selected" : ""}`}
              key={location.name}
              onClick={() => onSelect(location.name)}
              size="icon"
              title={location.name}
              type="button"
              variant="outline"
            >
              <LocationIcon />
            </Button>
          );
        })}
      </section>
      <section className="merchant-panel" aria-live="polite">
        <div className="merchant-heading">
          <span className="merchant-icon"><MapPin /></span>
          <span className="merchant-name-wrap">
            <span className="merchant-name">{merchant}</span>
            <span className="merchant-address">Jl. Melati No. 18 · 1,2 km</span>
          </span>
          <span className="cashback-pill"><Gift /> 5%</span>
        </div>
        <div className="merchant-footer">
          <span className="open-status"><span /> Buka sampai 21.00</span>
          <Button className="text-action" type="button" variant="ghost">Detail <ChevronRight /></Button>
        </div>
      </section>
      <section className="nearby-section">
        <div className="section-heading"><h2>Di sekitar kamu</h2><span className="section-count">03</span></div>
        <p className="supporting-copy">Pilih pin di peta untuk melihat penawaran.</p>
      </section>
    </>
  );
}

function TransferScreen({
  contact,
  notice,
  onContinue,
  onSelect,
}: {
  contact: string;
  notice: boolean;
  onContinue: () => void;
  onSelect: (name: string) => void;
}) {
  return (
    <>
      <StatusBar />
      <header className="screen-title-row">
        <div>
          <p className="eyebrow">Kirim dengan mudah</p>
          <h1>Transfer uang</h1>
        </div>
        <IconButton label="Bantuan transfer"><CircleHelp /></IconButton>
      </header>
      <section className="transfer-balance">
        <span className="transfer-balance-icon"><Wallet /></span>
        <span><span className="supporting-copy">Sumber dana</span><strong>Saldo utama</strong></span>
        <span className="transfer-balance-amount">Rp32 jt</span>
      </section>
      <div className="section-heading transfer-list-heading">
        <h2>Kirim ke</h2>
        <Button className="text-action" type="button" variant="ghost"><Plus /> Kontak baru</Button>
      </div>
      <div className="contact-list">
        {contacts.map((person) => (
          <Button
            aria-pressed={contact === person.name}
            className={`contact-row${contact === person.name ? " contact-row-selected" : ""}`}
            key={person.name}
            onClick={() => onSelect(person.name)}
            type="button"
            variant="ghost"
          >
            <span className="contact-avatar">{person.initials}</span>
            <span className="contact-copy"><strong>{person.name}</strong><span>{person.bank}</span></span>
            {contact === person.name ? <Check className="contact-check" /> : <ChevronRight className="contact-chevron" />}
          </Button>
        ))}
      </div>
      {contact && (
        <section className="transfer-selected" aria-live="polite">
          <p className="supporting-copy">Penerima dipilih</p>
          <h2>{contact}</h2>
          {notice ? (
            <p className="transfer-notice"><Check /> Detail transfer siap ditinjau.</p>
          ) : (
            <Button className="full-action" onClick={onContinue} type="button">Lanjutkan <ChevronRight /></Button>
          )}
        </section>
      )}
      <section className="transfer-shortcuts">
        <div className="section-heading"><h2>Cara lain</h2></div>
        <div className="shortcut-row">
          <span><Landmark /> Ke rekening bank</span><ChevronRight />
        </div>
        <div className="shortcut-row">
          <span><Smartphone /> Ke nomor ponsel</span><ChevronRight />
        </div>
      </section>
    </>
  );
}

function SettingsScreen({
  onlinePayments,
  onOnlinePaymentsChange,
  onCardTransactionsChange,
  cardTransactionsAllowed,
}: {
  onlinePayments: boolean;
  onOnlinePaymentsChange: (enabled: boolean) => void;
  onCardTransactionsChange: (enabled: boolean) => void;
  cardTransactionsAllowed: boolean;
}) {
  const [expandedSetting, setExpandedSetting] = useState("");
  return (
    <>
      <StatusBar />
      <header className="screen-title-row settings-heading">
        <div><p className="eyebrow">Keamanan & kontrol</p><h1>Pengaturan</h1></div>
      </header>
      <section className="settings-section" aria-labelledby="card-settings-title">
        <h2 id="card-settings-title">Kontrol kartu</h2>
        <div className="settings-list">
          <div className="setting-row">
            <span className="setting-icon"><CreditCard /></span>
            <span className="setting-copy"><strong>Transaksi kartu</strong><span>Izinkan pembayaran dengan kartu</span></span>
            <Switch aria-label="Izinkan transaksi kartu" checked={cardTransactionsAllowed} onCheckedChange={onCardTransactionsChange} />
          </div>
          <div className="setting-row">
            <span className="setting-icon"><ShieldCheck /></span>
            <span className="setting-copy"><strong>Pembayaran online</strong><span>Belanja aman di internet</span></span>
            <Switch aria-label="Izinkan pembayaran online" checked={onlinePayments} onCheckedChange={onOnlinePaymentsChange} />
          </div>
          <Button className="setting-link" onClick={() => setExpandedSetting(expandedSetting === "pin" ? "" : "pin")} type="button" variant="ghost">
            <span className="setting-icon"><LockKeyhole /></span>
            <span className="setting-copy"><strong>Lihat PIN kartu</strong><span>Periksa PIN dengan aman</span></span>
            <ChevronRight />
          </Button>
          {expandedSetting === "pin" && <p className="setting-detail">PIN hanya dapat dilihat setelah verifikasi keamanan.</p>}
          <Button className="setting-link" onClick={() => setExpandedSetting(expandedSetting === "card" ? "" : "card")} type="button" variant="ghost">
            <span className="setting-icon"><CreditCard /></span>
            <span className="setting-copy"><strong>Ganti kartu</strong><span>Kartu hilang, rusak, atau kedaluwarsa</span></span>
            <ChevronRight />
          </Button>
          {expandedSetting === "card" && <p className="setting-detail">Penggantian kartu tersedia melalui layanan nasabah.</p>}
        </div>
      </section>
      <section className="settings-section" aria-labelledby="preferences-title">
        <h2 id="preferences-title">Preferensi</h2>
        <div className="settings-list">
          <div className="shortcut-row"><span><Bell /> Notifikasi</span><ChevronRight /></div>
          <div className="shortcut-row"><span><CircleHelp /> Pusat bantuan</span><ChevronRight /></div>
        </div>
      </section>
      <p className="settings-version">Neobank · Versi 1.0</p>
    </>
  );
}

function ProfileScreen() {
  return (
    <>
      <StatusBar />
      <header className="profile-title"><h1>Profil</h1></header>
      <section className="profile-identity">
        <span className="profile-avatar">D</span>
        <h2>Dimas Ardiansyah</h2>
        <p className="supporting-copy">Nasabah sejak 2024</p>
      </section>
      <section className="profile-section" aria-labelledby="personal-info-title">
        <div className="section-heading"><h2 id="personal-info-title">Informasi pribadi</h2><Button className="text-action" type="button" variant="ghost">Edit</Button></div>
        <div className="profile-info-list">
          <ProfileInfo icon={UserRound} label="Nama" value="Dimas Ardiansyah" />
          <ProfileInfo icon={Mail} label="Email" value="dimas@example.com" />
          <ProfileInfo icon={Phone} label="Nomor ponsel" value="+62 812 0000 0000" />
          <ProfileInfo icon={MapPin} label="Alamat" value="Jakarta, Indonesia" />
        </div>
      </section>
      <section className="profile-section profile-account">
        <div className="section-heading"><h2>Informasi akun</h2></div>
        <div className="shortcut-row"><span><ShieldCheck /> Verifikasi identitas</span><ChevronRight /></div>
        <div className="shortcut-row"><span><Landmark /> Rekening & bank</span><ChevronRight /></div>
      </section>
    </>
  );
}

function ProfileInfo({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="profile-info-row">
      <Icon />
      <span><span>{label}</span><strong>{value}</strong></span>
    </div>
  );
}

function BottomNavigation({ active, onChange }: { active: TabKey; onChange: (screen: Screen) => void }) {
  return (
    <nav className="bottom-navigation" aria-label="Navigasi utama">
      {navigation.map((item) => {
        const NavIcon = item.icon;
        const isActive = item.id === active;
        return (
          <Button
            aria-current={isActive ? "page" : undefined}
            className={`nav-item${isActive ? " nav-item-active" : ""}`}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
            variant="ghost"
          >
            <NavIcon />
            <span>{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}