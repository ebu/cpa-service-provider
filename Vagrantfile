# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|
  config.vm.box = "ubuntu/trusty64"

  config.vm.provision "shell", inline: <<-SHELL
    sudo apt-get update
    sudo apt-get install -y nodejs npm

    sudo ln -s /usr/bin/nodejs /usr/bin/node

    cd /vagrant/
    npm install
  SHELL
end
