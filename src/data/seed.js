function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(rand(0, 23), rand(0, 59), 0, 0);
  return d.toISOString();
}

export function seed() {
  const names = [
    "Aino Korhonen", "Mika Laine", "Sara Niemi", "Oskari Heikkinen",
    "Emilia Virtanen", "Elias Lehto", "Noora Koski", "Joonas Mäkinen",
    "Ida Salonen", "Antti Hämäläinen", "Sofia Ranta", "Ville Ahonen",
  ];
  const plans = ["Free", "Pro", "Team"];
  const statuses = ["Active", "Paused", "Cancelled"];

  const users = names.map((name, idx) => {
    const plan = pick(plans);
    const status = pick(statuses);
    return {
      id: `u_${idx + 1}`,
      name,
      email: name.toLowerCase().replace(/ /g, ".").replace(/ä/g, "a").replace(/ö/g, "o") + "@example.com",
      plan,
      status,
      spend: plan === "Free" ? rand(0, 40) : plan === "Pro" ? rand(120, 1200) : rand(500, 4200),
      lastSeen: daysAgo(rand(0, 28)),
    };
  });

  const revenue = {
    "7d": Array.from({ length: 10 }, () => rand(6000, 22000)),
    "30d": Array.from({ length: 16 }, () => rand(8000, 34000)),
    "90d": Array.from({ length: 22 }, () => rand(9000, 42000)),
  };

  const transactions = [
    { id: "t1", type: "order", title: "Checkout", user: "Aino", amount: 129, date: daysAgo(1) },
    { id: "t2", type: "invoice", title: "Invoice #1042", user: "Team Plan", amount: 899, date: daysAgo(2) },
    { id: "t3", type: "refund", title: "Refund", user: "Sara", amount: -49, date: daysAgo(3) },
    { id: "t4", type: "order", title: "Checkout", user: "Emilia", amount: 199, date: daysAgo(4) },
    { id: "t5", type: "invoice", title: "Invoice #1041", user: "Pro Plan", amount: 299, date: daysAgo(6) },
  ];

  const kpis = {
    revenue: 84320,
    orders: 3120,
    users: 14820,
    churn: 2.4,
  };

  return { users, revenue, transactions, kpis };
}