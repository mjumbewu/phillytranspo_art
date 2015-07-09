# phillytranspo_art

A view of the [select] modes of transport, revealed by activation, to illustrate the levels/amount/rate of movement across the city.

* Bike share pods flash when the number of bikes available changes (currently 15 minute intervals)
* Rail stations change with frequency of service during 15 minute windows (radius changes for heavy rail, opacity changes for light rail)
* Bus routes traced by shooters (eventually will glow more heavily based on bus frequency)

See @karaml's project pitch at https://www.youtube.com/watch?v=WzKfrfQLBX8

## Data

* Quasi-realtime data from the Indego bike share API. Historical snapshot courtesy of @jamestyack.
* GTFS data from SEPTA for the bus routes and rail frequencies

## Setup

Fork this repository and clone it to your local machine. The latest code is in the `gh-pages` branch, so be sure to `git checkout gh-pages`.

To view the piece on your local machine, you have to have a local server running. An easy option for this is to use the `SimpleHTTPServer` that comes with Python:

    python -m SimpleHTTPServer

By default, this will start a server on port 8000 (you can specify a different port as a parameter if you want). Open `http://localhost:8000` in a Chrome or Firefox.
