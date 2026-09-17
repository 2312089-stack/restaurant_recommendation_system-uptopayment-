import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  Phone,
  UtensilsCrossed,
} from "lucide-react";

const STORAGE_KEY = "tasteReservations";

const RESTAURANTS = [
  { id: "pizza-palace", name: "Pizza Palace", city: "Kovilpatti" },
  { id: "spice-garden", name: "Spice Garden", city: "Kovilpatti" },
  { id: "burger-junction", name: "Burger Junction", city: "Tirunelveli" },
  { id: "sushi-express", name: "Sushi Express", city: "Madurai" },
  { id: "paradise-biryani", name: "Paradise Biryani", city: "Kovilpatti" },
];

const TIME_SLOTS = [
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
];

const readReservations = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const today = () => new Date().toISOString().split("T")[0];

const ReservationsPage = ({ onBack }) => {
  const [reservations, setReservations] = useState(readReservations);
  const [restaurantId, setRestaurantId] = useState(RESTAURANTS[0].id);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
    } catch (error) {
      // storage unavailable - ignore
    }
  }, [reservations]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const sortedReservations = useMemo(
    () =>
      [...reservations].sort(
        (a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`)
      ),
    [reservations]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter the name for the reservation.");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    const restaurant = RESTAURANTS.find((item) => item.id === restaurantId);
    const reservation = {
      id: `RSV${Date.now().toString().slice(-8)}`,
      restaurantId,
      restaurantName: restaurant ? restaurant.name : "Restaurant",
      city: restaurant ? restaurant.city : "",
      date,
      time,
      guests: Number(guests),
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    setReservations((prev) => [reservation, ...prev]);
    setSuccess(
      `Table booked at ${reservation.restaurantName} for ${reservation.guests} on ${reservation.date} at ${reservation.time}.`
    );
    setName("");
    setPhone("");
    setNotes("");
  };

  const handleCancel = (id) => {
    setReservations((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Home</span>
        </button>

        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Table Reservations
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Book a table at your favourite restaurant
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Restaurant
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                <select
                  value={restaurantId}
                  onChange={(event) => setRestaurantId(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {RESTAURANTS.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name} - {restaurant.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                  <input
                    type="date"
                    min={today()}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                  <select
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Guests
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                <select
                  value={guests}
                  onChange={(event) => setGuests(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? "Guest" : "Guests"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Special Requests
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Window table, birthday cake, etc. (optional)"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                <XCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
            >
              Confirm Reservation
            </button>
          </form>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Reservations
            </h2>

            {success && (
              <div className="flex items-start space-x-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {sortedReservations.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 text-center">
                <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No reservations yet. Book a table to see it here.
                </p>
              </div>
            ) : (
              sortedReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {reservation.restaurantName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {reservation.city} · #{reservation.id}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 capitalize">
                      {reservation.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span>{reservation.date}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>{reservation.time}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      <span>
                        {reservation.guests}{" "}
                        {reservation.guests === 1 ? "Guest" : "Guests"}
                      </span>
                    </div>
                    {reservation.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                        {reservation.notes}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCancel(reservation.id)}
                    className="mt-3 w-full py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Cancel Reservation
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationsPage;
