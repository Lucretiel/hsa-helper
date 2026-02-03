# Claude Instructions

The goal of this project is to create a simple web app that will help me manage my HSA. Specifically, I should be able to upload receipts and indicate how much was spent, as well as records of HSA withdrawls. It should then be able to tell me at any given time how much more money I have available to withdraw; that is, how much in medical expenses I've accumulated have not yet been covered by HSA withdraws.

This project should use beads for task tracking; see @AGENTS.md for details.

## Architecture

The project should be a single self-contained Tauri app; it should use react + typescript for the tauri frontend. It should use a flake to manage any development toolchains it needs (Rust, Node.js, etc). Use npm for package management (not Bun or Deno).

For the storage backend, it will use the dropbox API. It should be designed in such a way as to minimize the risk of conflicts. Metadata should live in a single large JSON files, with PDFs existing separately. When updating the JSON, take care to avoid conflicts, and reconcile if necessary.

Be sure to use integers instead of floats for tracking money, whenever possible.

Because the PDFs are sensitive private information, care should be taken with their local storage. They should be evicted from local storage fairly quickly when downloaded during viewing, and ideally can be viewed directly in the app without hitting the disk at all.

## User features

This app has two main purposes: I want to be able to record HSA activity for tax and auditing purposes, and I want to have an understanding of how much medical expense I've accumulated throughout the year that has not yet been covered by HSA withdrawls.

It should be possible to upload a few kinds of item: expenses, HSA withdrawls, and HSA deposits. They should be very similar:

- An optional date, defaulting to today
- A reciept or other PDF with a record of the transaction
- A dollar amount

HSA deposits indicate money that I am adding to the HSA. This mostly exists for tax tracking purposes, so that at the end of the year I can record how much money I can deduct from my income via HSA deposits.

For expenses, you should also be able to add a description with a brief, arbitrary description of the service.

It should be possible to view a chronological list of events, with filtering by date range or event type.

Ideally, it should be possible to view the PDFs inline in the browser, avoiding the need to download them to disk.

It should be possible to view how much unfilled medical expenses I have available to cover with an HSA withdrawl.

The app does not need to have an authoritative sense of my HSA balance, because money may enter the HSA in other ways besides manual contributions. The deposit tracking is just for tax purposes, so that I can report an income deduction.
