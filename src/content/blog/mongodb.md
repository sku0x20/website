why i don't like mongo.

mongodb is scehmaless and its requires more discipline to work.
as martin flower said nothing is schemaless, its always there, either at write time or at readtime. in sql systems its at writetime, and it fails there. mongo like systems where it fails at readtime.

and i feel in cases like failure at readtime issue is much bigger.
and the issue exemplifies when you can put any value for same key. at least that should not be allowed. create new key. 2 docs with same keys but different value type. its a pita to work with.

instead of byte its a long integer. how it came idk. it got caught during migration.

mongo does have validator support now. but idk. tbh if i have to build something from scratch i would prefer a system with schema. if i want a i like these new NoSql systems, like Clickhouse, they have sql benefits and nosql flexibilities. i haven't used the json type but it looks good.

if i recall postgress also have good json support, but i have not worked with postgress so idk how it works. how costly it is? is it worth.
