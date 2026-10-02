// Kumpulan class Tailwind yang dipakai berulang, supaya tampilan konsisten
export const ui = {
  input:
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200",
  btn: "inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50",
  btnPrimary:
    "inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50",
  btnDanger:
    "inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50",
  card: "rounded-xl border border-stone-200 bg-white p-4",
  error: "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700",
  chip: (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
      active
        ? "border-orange-500 bg-orange-500 text-white"
        : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
    }`,
};
