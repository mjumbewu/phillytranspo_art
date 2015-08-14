import csv
import json
from collections import defaultdict

def do_subway_route(name):
    print('Doing %s' % name)

    station_names = {}

    with open('septa_gtfs/google_bus/routes.txt') as routes_file:
        route_reader = csv.DictReader(routes_file)
        for route in route_reader:
            if route['route_short_name'] == name:
                break
        else:
            raise Exception('Couldn\'t file route %s' % name)

    route_id = route['route_id']

    trips = []
    with open('septa_gtfs/google_bus/trips.txt') as trips_file:
        trip_reader = csv.DictReader(trips_file)
        for trip in trip_reader:
            if trip['route_id'] == route_id:
                trips.append(trip)
        if len(trips) == 0:
            raise Exception('Couldn\'t find any trips for route %s' % route_id)

    trip_ids = set(t['trip_id'] for t in trips)
    interval_duration = 15
    interval_count = (60 * 24) // interval_duration
    snapshots = [defaultdict(int) for _ in range(interval_count)]
    stop_ids = set()
    with open('septa_gtfs/google_bus/stop_times.txt') as stoptimes_file:
        stoptime_reader = csv.DictReader(stoptimes_file)
        for stoptime in stoptime_reader:
            if stoptime['trip_id'] in trip_ids:
                arrival = stoptime['arrival_time'].split(':')
                arrival = int(arrival[0]) * 60 + int(arrival[1])

                # Align to a 15 minute interval
                time_key = (arrival // interval_duration) % interval_count
                stop_id = stoptime['stop_id']
                snapshots[time_key][stop_id] += 1

                stop_ids.add(stop_id)

    for snapshot in snapshots:
        for stop_id in stop_ids:
            snapshot.setdefault(stop_id, 0)

    stops = []
    with open('septa_gtfs/google_bus/stops.txt') as stops_file:
        stop_reader = csv.DictReader(stops_file)
        for stop in stop_reader:
            if stop['stop_id'] in stop_ids:
                stops.append(stop)

    with open('data/%s.json' % name.lower(), 'w') as subway_file:
        json.dump(snapshots, subway_file, indent=2)

    with open('data/%s_stops.json' % name.lower(), 'w') as subway_stops_file:
        json.dump(stops, subway_stops_file, indent=2)


do_subway_route('MFL')
do_subway_route('BSL')
do_subway_route('10')
do_subway_route('11')
do_subway_route('13')
do_subway_route('34')
do_subway_route('36')
do_subway_route('15')
do_subway_route('101B')
do_subway_route('102B')
do_subway_route('NHSL')
