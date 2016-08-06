#!/bin/bash

source /etc/lsb-release && echo "deb http://download.rethinkdb.com/apt $DISTRIB_CODENAME main" | sudo tee /etc/apt/sources.list.d/rethinkdb.list
wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | sudo apt-key add -

apt-get update
apt-get install -y rethinkdb

cd /etc/rethinkdb/
cp default.conf.sample instances.d/default.conf
sed -i 's/# bind=127.0.0.1/bind=all/' instances.d/default.conf
/etc/init.d/rethinkdb restart
