"""
Create a JSON file that contains the route traces of the routes in the GTFS.
Multiple shapes may correspond to each route, so we take the shape with the
most trips on the route.
"""

import csv
import json
from collections import defaultdict

#
# 1. Count the number of trips in each direction that use a particular shape.
#    Store them in a dict mapping from (route_id, dir_id) pair to dict of
#    shape_id to count. This will tell us (later on) which shape is most common
#    for each route. We'll use the most common shape for a route as "the" shape
#    for that route.
#
shape_counts = defaultdict(lambda: defaultdict(int))
with open('gtfs/trips.txt') as trips_file:
    trip_reader = csv.DictReader(trips_file)

    for trip in trip_reader:
        route_id = trip['route_id']
        direction_id = trip['direction_id']
        shape_id = trip['shape_id']

        shape_counts[(route_id, int(direction_id))][shape_id] += 1

#
# 2. Store the shape ID with the highest number of trips for each route (the
#    most common shapes) in a dict mapping from (route_id, dir_id) to shape_id.
#
common_shape_ids = {}
for route_key in shape_counts:
    shape_counts_by_route = shape_counts[route_key]
    common_shape_ids[route_key] = max(
        shape_counts_by_route.keys(),
        key=shape_counts_by_route.get)
indexed_shape_ids = set(common_shape_ids.values())

# Route Types:
# 0 - Light rail
# 1 - Heavy rail
# 3 - Bus

#
# 3a. Store all the routes in a dictionary keyed by the route_id. Focus on the
#    busses (route type 3)...
#
routes = {}
with open('gtfs/routes.txt') as routes_file:
    route_reader = csv.DictReader(routes_file)
    for route in route_reader:
        if route['route_type'] == '3':
            routes[route['route_id']] = route

#
# 3b. ...and do the same with the shapes, but only the ones that are the most
#     common shapes for their respective route.
#
shapes = defaultdict(list)
with open('gtfs/shapes.txt') as shapes_file:
    shape_pt_reader = csv.DictReader(shapes_file)
    for shape_pt in shape_pt_reader:
        shape_id = shape_pt['shape_id']
        if shape_id in indexed_shape_ids:
            coords = (shape_pt['shape_pt_lon'], shape_pt['shape_pt_lat'])
            shapes[shape_id].append(coords)

#
# 4. Merge each route into a single shape. Most routes have two directions.
#    Append one direction onto the other.
#
# Merge the directions
shapes_by_route = {}
seen_routes = set()
for route_id, direction_id in common_shape_ids:
    if route_id in seen_routes:
        continue

    if route_id not in routes:
        continue

    shape_id_1 = common_shape_ids[(route_id, direction_id)]
    shape_id_2 = common_shape_ids.get((route_id, 1 - direction_id), None)

    route = routes[route_id]
    shape_1 = shapes[shape_id_1]
    shape_2 = shapes[shape_id_2] if shape_id_2 is not None else None

    if shape_2 is None or set(shape_1) == set(shape_2):
        shape = shape_1
    else:
        shape = shape_1 + shape_2

    shapes_by_route[route['route_short_name']] = shape
    seen_routes.add(route_id)

#
# 5. Finally, export all the route shapes into a JSON file.
#
with open('data/shapes.json', 'w') as shapes_file:
    json.dump(shapes_by_route, shapes_file, indent=1)
