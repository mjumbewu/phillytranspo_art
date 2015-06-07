import csv
import json
from collections import defaultdict


shape_counts = defaultdict(lambda: defaultdict(int))
with open('gtfs/trips.txt') as trips_file:
    trip_reader = csv.DictReader(trips_file)
    for trip in trip_reader:
        route_id = trip['route_id']
        direction_id = trip['direction_id']
        shape_id = trip['shape_id']
        shape_counts[(route_id, int(direction_id))][shape_id] += 1

shape_ids = {}
for route_key in shape_counts:
    shape_ids[route_key] = max(shape_counts[route_key], key=lambda shape_id: shape_counts[route_key][shape_id])
indexed_shape_ids = set(shape_ids.values())

# Route Types:
# 0 - Light rail
# 1 - Heavy rail
# 3 - Bus

routes = {}
with open('gtfs/routes.txt') as routes_file:
    route_reader = csv.DictReader(routes_file)
    for route in route_reader:
        routes[route['route_id']] = route

shapes = defaultdict(list)
with open('gtfs/shapes.txt') as shapes_file:
    shape_pt_reader = csv.DictReader(shapes_file)
    for shape_pt in shape_pt_reader:
        shape_id = shape_pt['shape_id']
        if shape_id in indexed_shape_ids:
            coords = (shape_pt['shape_pt_lon'], shape_pt['shape_pt_lat'])
            shapes[shape_id].append(coords)

# Merge the directions
shapes_by_route = {}
seen_routes = set()
for route_id, direction_id in shape_ids:
    if route_id in seen_routes:
        continue

    shape_id_1 = shape_ids[(route_id, direction_id)]
    shape_id_2 = shape_ids.get((route_id, 1 - direction_id), None)

    route = routes[route_id]
    shape_1 = shapes[shape_id_1]
    shape_2 = shapes[shape_id_2] if shape_id_2 is not None else None

    if shape_2 is None or set(shape_1) == set(shape_2):
        shape = shape_1
    else:
        shape = shape_1 + shape_2

    shapes_by_route[route['route_short_name']] = shape
    seen_routes.add(route_id)

with open('shapes.json', 'w') as shapes_file:
    json.dump(shapes_by_route, shapes_file, indent=1)
