# phillytranspo_art

A view of the [select] modes of transport, revealed by activation, to illustrate the levels/amount/rate of movement across the city.

* Bike share pods flash when the number of bikes available changes (currently 15 minute intervals)
* Rail stations change with frequency of service during 15 minute windows (radius changes for heavy rail, opacity changes for light rail)
* Bus routes traced by shooters (eventually will glow more heavily based on bus frequency)

See @karaml's project pitch at https://www.youtube.com/watch?v=WzKfrfQLBX8

## Data

* Quasi-realtime data from the Indego bike share API. Historical snapshot courtesy of @jamestyack.
* GTFS data from SEPTA for the bus routes and rail frequencies
