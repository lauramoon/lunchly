/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** Falsy values in notes -> empty string */

  get notes() {
    return this._notes;
  }

  set notes(val) {
    this._notes = (val) ? val : "";
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }


  /** get list of customers matching search term */

  static async search(term) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       WHERE first_name ILIKE $1
        OR last_name ILIKE $1
        OR (first_name ||  ' ' || last_name) ILIKE $1
       ORDER BY last_name, first_name`,
       [`${term}%`]
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get list of top ten customers by number of reservations */

  static async topTen() {
    const results = await db.query(
      `SELECT customer_id, COUNT(customer_id) AS number
        FROM reservations
        GROUP BY customer_id
        ORDER BY number DESC
        LIMIT 10`
    );

    const topCustomers = await Promise.all(
      results.rows.map(async function (r) {
        const topCustomer = await Customer.get(r.customer_id);
        return { customer: topCustomer, count: r.number}
      })
    ) 

    return topCustomers;
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }

  /** return full name of customer */

  fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

module.exports = Customer;
